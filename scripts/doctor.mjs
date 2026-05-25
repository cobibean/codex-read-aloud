#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { configPath, readConfig } from "./lib/read-aloud.mjs";

const checks = [];
const config = readConfig();
const codexConfigPath = resolve(homedir(), ".codex", "config.toml");

check("Node.js", process.versions.node, true);
check("macOS say", "say command on PATH", commandExists("say"));
check("macOS afplay", "afplay command on PATH", commandExists("afplay"));
check("Runtime config", configPath, existsSync(configPath));
check("Provider", config.provider, ["macos", "openai"].includes(config.provider));
check("OpenAI key", "OPENAI_API_KEY env or Keychain item", Boolean(getOpenAIApiKeyStatus()));
check("Codex config", "~/.codex/config.toml", existsSync(codexConfigPath));
check("Codex automatic notify", "not enabled (expected)", !codexConfigContainsReadAloud(codexConfigPath));
check("Claude Code CLI", "claude command on PATH", commandExists("claude"));
check("Codex CLI", "codex command on PATH", commandExists("codex"));

for (const item of checks) {
  process.stdout.write(`${item.ok ? "PASS" : "WARN"} ${item.name}: ${item.detail}\n`);
}

if (checks.some((item) => !item.ok && item.name !== "OpenAI key" && item.name !== "Codex automatic notify" && item.name !== "Claude Code CLI" && item.name !== "Codex CLI")) {
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
