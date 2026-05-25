import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";

export const appSupportDir = join(homedir(), "Library", "Application Support", "codex-read-aloud");
export const configPath = join(appSupportDir, "config.json");
export const wrapperPath = join(appSupportDir, "wrapper.json");
export const statePath = join(appSupportDir, "state.json");

const defaultConfig = {
  provider: "macos",
  voice: "Samantha",
  rate: 185,
  speakMode: "final",
  maxCharacters: 3000,
  includeCodeBlocks: false,
  stopPrevious: true,
  openaiModel: "gpt-4o-mini-tts",
  openaiVoice: "coral",
  openaiApiKeyEnv: "OPENAI_API_KEY",
  openaiApiKeyCommand: [
    "security",
    "find-generic-password",
    "-a",
    "codex-read-aloud",
    "-s",
    "codex-read-aloud-openai-api-key",
    "-w"
  ],
  openaiInstructions: "Speak naturally and warmly, like a calm coding partner reading a concise technical answer aloud. Avoid announcer energy. Keep code identifiers clear.",
  openaiSpeed: 1
};

export function ensureRuntimeFiles() {
  mkdirSync(appSupportDir, { recursive: true });
  if (!existsSync(configPath)) {
    writeJson(configPath, defaultConfig);
  }
}

export function readConfig() {
  ensureRuntimeFiles();
  return { ...defaultConfig, ...readJson(configPath, {}) };
}

export function readWrapper() {
  return readJson(wrapperPath, {});
}

export function writeWrapper(value) {
  ensureRuntimeFiles();
  writeJson(wrapperPath, value);
}

export function readState() {
  return readJson(statePath, {});
}

export function writeState(value) {
  ensureRuntimeFiles();
  writeJson(statePath, value);
}

export function findLatestSessionFile(codexHome = process.env.CODEX_HOME || join(homedir(), ".codex")) {
  const sessionsDir = join(codexHome, "sessions");
  if (!existsSync(sessionsDir)) {
    return null;
  }

  let latest = null;
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".jsonl")) {
        continue;
      }
      const stats = statSync(fullPath);
      if (!latest || stats.mtimeMs > latest.mtimeMs) {
        latest = { path: fullPath, mtimeMs: stats.mtimeMs };
      }
    }
  };

  visit(sessionsDir);
  return latest?.path ?? null;
}

export function getLatestAssistantMessage(sessionFile, config = readConfig()) {
  if (!sessionFile || !existsSync(sessionFile)) {
    return null;
  }

  const lines = readFileSync(sessionFile, "utf8").split(/\r?\n/);
  const messages = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      continue;
    }

    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }

    const payload = record.payload;
    if (record.type !== "response_item" || payload?.type !== "message" || payload.role !== "assistant") {
      continue;
    }

    const text = extractMessageText(payload.content);
    if (!text.trim()) {
      continue;
    }

    messages.push({
      key: messageKey(sessionFile, index, text),
      line: index + 1,
      phase: payload.phase || "unknown",
      timestamp: record.timestamp || null,
      rawText: text,
      text: prepareSpeechText(text, config)
    });
  }

  if (messages.length === 0) {
    return null;
  }

  if (config.speakMode === "all") {
    return messages.at(-1);
  }

  return [...messages].reverse().find((message) => message.phase === "final") ?? messages.at(-1);
}

export function prepareSpeechText(text, config = readConfig()) {
  let output = text;

  if (!config.includeCodeBlocks) {
    output = output.replace(/```[\s\S]*?```/g, " Code block omitted. ");
  }

  output = output
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

  const maxCharacters = Number(config.maxCharacters) || defaultConfig.maxCharacters;
  if (output.length > maxCharacters) {
    return `${output.slice(0, maxCharacters).trim()}...`;
  }

  return output;
}

export async function speakText(text, config = readConfig()) {
  const cleanText = text.trim();
  if (!cleanText) {
    return { spoken: false, reason: "empty" };
  }

  if (process.env.CODEX_READ_ALOUD_DRY_RUN === "1") {
    process.stdout.write(`${cleanText}\n`);
    return { spoken: false, reason: "dry-run" };
  }

  if (config.stopPrevious !== false) {
    stopPreviousPlayback();
  }

  if (config.provider === "openai") {
    return speakWithOpenAI(cleanText, config);
  }

  return speakWithMacOS(cleanText, config);
}

export function stopPreviousPlayback() {
  const state = readState();
  const pid = Number(state.playback?.pid);
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, "SIGTERM");
    return true;
  } catch {
    return false;
  }
}

export async function speakLatestAssistantMessage() {
  const config = readConfig();
  const state = readState();
  const sessionFile = findLatestSessionFile();
  const message = getLatestAssistantMessage(sessionFile, config);

  if (!message) {
    return { spoken: false, reason: "no-message" };
  }

  if (state.lastSpokenKey === message.key) {
    return { spoken: false, reason: "already-spoken" };
  }

  if (!message.text) {
    return { spoken: false, reason: "empty-after-cleanup" };
  }

  const result = await speakText(message.text, config);
  if (result.spoken) {
    writeState({
      ...state,
      lastSessionFile: sessionFile,
      lastSpokenKey: message.key,
      lastSpokenAt: new Date().toISOString(),
      lastSpokenLine: message.line,
      playback: result.playback || state.playback || null
    });
  }

  return { ...result, message };
}

export async function speakLatestCodexAssistantMessage() {
  const config = readConfig();
  const sessionFile = findLatestSessionFile();
  const message = getLatestAssistantMessage(sessionFile, config);

  if (!message) {
    return { spoken: false, reason: "no-message" };
  }

  if (!message.text) {
    return { spoken: false, reason: "empty-after-cleanup" };
  }

  const result = await speakText(message.text, config);
  return { ...result, message };
}

export async function readStdin() {
  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }
  return input;
}

function extractMessageText(content) {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (typeof part?.text === "string") {
        return part.text;
      }
      if (typeof part?.output_text === "string") {
        return part.output_text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function messageKey(sessionFile, lineIndex, text) {
  const digest = createHash("sha256").update(text).digest("hex").slice(0, 16);
  return `${sessionFile}:${lineIndex}:${digest}`;
}

function speakWithMacOS(text, config) {
  if (process.platform !== "darwin" || !commandExists("say")) {
    const reason = process.platform === "darwin" ? "missing-say" : "unsupported-platform";
    warn(`macOS speech unavailable: ${reason}`);
    return { spoken: false, reason };
  }

  const args = [];
  if (config.voice) {
    args.push("-v", String(config.voice));
  }
  if (config.rate) {
    args.push("-r", String(config.rate));
  }
  args.push(text);

  const child = spawn("say", args, {
    detached: true,
    stdio: "ignore"
  });
  child.on("error", (error) => warn(`say failed: ${error.message}`));
  child.unref();

  return {
    spoken: true,
    provider: "macos",
    playback: {
      pid: child.pid,
      provider: "macos",
      startedAt: new Date().toISOString()
    }
  };
}

async function speakWithOpenAI(text, config) {
  try {
    const apiKey = getOpenAIApiKey(config);
    if (!apiKey) {
      warn("OpenAI provider selected, but no API key was available. Falling back to macOS speech.");
      return speakWithMacOS(text, config);
    }

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.openaiModel || "gpt-4o-mini-tts",
        voice: config.openaiVoice || "alloy",
        input: text,
        instructions: config.openaiInstructions || undefined,
        response_format: "mp3",
        speed: Number(config.openaiSpeed) || undefined
      })
    });

    if (!response.ok) {
      warn(`OpenAI speech request failed with HTTP ${response.status}. Falling back to macOS speech.`);
      return speakWithMacOS(text, config);
    }

    if (process.platform !== "darwin" || !commandExists("afplay")) {
      const reason = process.platform === "darwin" ? "missing-afplay" : "unsupported-platform";
      warn(`OpenAI audio playback unavailable: ${reason}`);
      return { spoken: false, reason };
    }

    const audioPath = join(tmpdir(), `codex-read-aloud-${Date.now()}.mp3`);
    const audio = Buffer.from(await response.arrayBuffer());
    writeFileSync(audioPath, audio);

    const child = spawn("afplay", [audioPath], {
      detached: true,
      stdio: "ignore"
    });
    child.on("error", (error) => warn(`afplay failed: ${error.message}`));
    child.unref();

    return {
      spoken: true,
      provider: "openai",
      playback: {
        pid: child.pid,
        provider: "openai",
        audioPath,
        startedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    warn(`OpenAI speech failed: ${error.message}. Falling back to macOS speech.`);
    return speakWithMacOS(text, config);
  }
}

function getOpenAIApiKey(config) {
  const envKey = process.env[config.openaiApiKeyEnv || "OPENAI_API_KEY"];
  if (envKey) {
    return envKey;
  }

  if (!Array.isArray(config.openaiApiKeyCommand) || config.openaiApiKeyCommand.length === 0) {
    return "";
  }

  const [command, ...args] = config.openaiApiKeyCommand;
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 3000
  });

  if (result.status !== 0) {
    return "";
  }

  return result.stdout.trim();
}

function debugLog(message) {
  if (process.env.CODEX_READ_ALOUD_DEBUG === "1") {
    process.stderr.write(`[codex-read-aloud] ${message}\n`);
  }
}

function warn(message) {
  process.stderr.write(`[codex-read-aloud] ${message}\n`);
}

function commandExists(command) {
  return spawnSync("which", [command], { stdio: "ignore" }).status === 0;
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}
