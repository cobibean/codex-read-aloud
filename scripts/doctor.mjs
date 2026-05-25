#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { configPath, readConfig, wrapperPath } from "./lib/read-aloud.mjs";

const checks = [];
const config = readConfig();
const codexConfigPath = resolve(homedir(), ".codex", "config.toml");
const codexReadAloudCachePath = resolve(homedir(), ".codex", "plugins", "cache", "plugins-cli", "codex-read-aloud");

check("Node.js", process.versions.node, true);
check("macOS say", "say command on PATH", commandExists("say"));
check("macOS afplay", "afplay command on PATH", commandExists("afplay"));
check("Runtime config", configPath, existsSync(configPath));
check("Provider", config.provider, ["macos", "openai"].includes(config.provider));
check("OpenAI key", "OPENAI_API_KEY env or Keychain item", Boolean(getOpenAIApiKeyStatus()));
check("Codex config", "~/.codex/config.toml", existsSync(codexConfigPath));
check("Codex automatic notify", "not enabled (expected)", !codexConfigContainsReadAloud(codexConfigPath));
check("Codex stale hook state", "not present (expected)", !codexConfigContainsStaleHook(codexConfigPath));
check("Codex stale plugin cache", "not present (expected)", !cacheContainsAutoFiles(codexReadAloudCachePath));
check("Codex stale notify wrapper", "not present (expected)", !wrapperLooksStale(wrapperPath));
check("Claude Code CLI", "claude command on PATH", commandExists("claude"));
check("Codex CLI", "codex command on PATH", commandExists("codex"));

for (const item of checks) {
  process.stdout.write(`${item.ok ? "PASS" : "WARN"} ${item.name}: ${item.detail}\n`);
}

if (checks.some((item) => !item.ok && ![
  "OpenAI key",
  "Codex automatic notify",
  "Codex stale hook state",
  "Codex stale plugin cache",
  "Codex stale notify wrapper",
  "Claude Code CLI",
  "Codex CLI"
].includes(item.name))) {
  process.exit(1);
}

function check(name, detail, ok) {
  checks.push({ name, detail, ok: Boolean(ok) });
}

function commandExists(command) {
  return spawnSync("which", [command], { stdio: "ignore" }).status === 0;
}

function getOpenAIApiKeyStatus() {
  if (process.env.OPENAI_API_KEY) {
    return "env";
  }
  const result = spawnSync("security", [
    "find-generic-password",
    "-a",
    "codex-read-aloud",
    "-s",
    "codex-read-aloud-openai-api-key",
    "-w"
  ], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  });
  return result.status === 0 && result.stdout.trim() ? "keychain" : "";
}

function codexConfigContainsReadAloud(path) {
  try {
    return readFileSync(path, "utf8").includes("codex-read-aloud-notify.mjs");
  } catch {
    return false;
  }
}

function codexConfigContainsStaleHook(path) {
  try {
    return readFileSync(path, "utf8").includes("[hooks.state.\"codex-read-aloud@");
  } catch {
    return false;
  }
}

function cacheContainsAutoFiles(path) {
  if (!existsSync(path)) {
    return false;
  }

  const staleNames = new Set([
    "hooks.json",
    "codex-read-aloud-notify.mjs",
    "claude-read-aloud-hook.mjs"
  ]);

  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory() && visit(fullPath)) {
        return true;
      }
      if (entry.isFile() && staleNames.has(entry.name)) {
        return true;
      }
    }
    return false;
  };

  return visit(path);
}

function wrapperLooksStale(path) {
  try {
    const text = readFileSync(path, "utf8");
    return text.includes("codex-read-aloud-notify.mjs") || text.includes("/codex-read-aloud/0.1.0");
  } catch {
    return false;
  }
}
