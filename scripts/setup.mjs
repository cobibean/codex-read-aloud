#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2] || "auto";
const validTargets = new Set(["auto", "codex", "claude", "all"]);

if (!validTargets.has(target)) {
  process.stderr.write("Usage: node scripts/setup.mjs [auto|codex|claude|all]\n");
  process.exit(1);
}

const didCodex = target === "codex" || target === "all" || (target === "auto" && commandExists("codex"));
const didClaude = target === "claude" || target === "all" || (target === "auto" && commandExists("claude"));

if (!didCodex && !didClaude) {
  process.stderr.write("Could not find Codex or Claude Code on PATH. Install one first, then rerun setup.\n");
  process.exit(1);
}

if (didCodex) {
  run("node", [resolve(pluginRoot, "scripts", "install-notify.mjs")], "Codex notify setup failed.");
}

if (didClaude) {
  setupClaude();
}

process.stdout.write("\nNext: add your OpenAI API key safely if you want the high-quality voice:\n");
process.stdout.write("  node scripts/store-openai-key.mjs\n");
process.stdout.write("  node scripts/set-quality.mjs openai-natural\n\n");
process.stdout.write("Then restart Codex or Claude Code so new plugin/hook settings are loaded.\n");

function setupClaude() {
  if (!existsSync(resolve(pluginRoot, ".claude-plugin", "marketplace.json"))) {
    process.stderr.write("Skipping Claude Code setup: .claude-plugin/marketplace.json is missing.\n");
    return;
  }

  const add = spawnSync("claude", ["plugin", "marketplace", "add", pluginRoot], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (add.status !== 0 && !`${add.stderr}${add.stdout}`.includes("already")) {
    process.stderr.write(add.stderr || add.stdout || "Claude marketplace add failed.\n");
    return;
  }

  const install = spawnSync("claude", ["plugin", "install", "codex-read-aloud@codex-read-aloud"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (install.status !== 0 && !`${install.stderr}${install.stdout}`.includes("already")) {
    process.stderr.write(install.stderr || install.stdout || "Claude plugin install failed.\n");
    return;
  }

  process.stdout.write("Claude Code plugin marketplace and plugin are configured.\n");
}

function commandExists(command) {
  return spawnSync("which", [command], { stdio: "ignore" }).status === 0;
}

function run(command, args, errorMessage) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "inherit"
  });
  if (result.status !== 0) {
    throw new Error(errorMessage);
  }
}
