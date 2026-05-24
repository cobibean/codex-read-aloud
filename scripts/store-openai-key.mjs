#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { closeSync, openSync, readFileSync, readSync } from "node:fs";

const key = process.env.OPENAI_API_KEY || readKeyFromPrompt();

if (!key.trim()) {
  process.stderr.write("No API key provided.\n");
  process.exit(1);
}

const result = spawnSync("security", [
  "add-generic-password",
  "-U",
  "-a",
  "codex-read-aloud",
  "-s",
  "codex-read-aloud-openai-api-key",
  "-w",
  key.trim()
], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"]
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || "Failed to store OpenAI API key in Keychain.\n");
  process.exit(result.status || 1);
}

process.stdout.write("Stored OpenAI API key in macOS Keychain for Codex Read Aloud.\n");

function readKeyFromPrompt() {
  if (!process.stdin.isTTY) {
    return readFileSync(0, "utf8").trim();
  }

  process.stderr.write("OpenAI API key: ");
  spawnSync("stty", ["-echo"], { stdio: "inherit" });
  try {
    return readLineFromTty().trim();
  } finally {
    spawnSync("stty", ["echo"], { stdio: "inherit" });
    process.stderr.write("\n");
  }
}

function readLineFromTty() {
  const fd = openSync("/dev/tty", "r");
  const buffer = Buffer.alloc(1);
  let value = "";

  try {
    while (readSync(fd, buffer, 0, 1, null) === 1) {
      const char = buffer.toString("utf8");
      if (char === "\n" || char === "\r") {
        break;
      }
      value += char;
    }
  } finally {
    closeSync(fd);
  }

  return value;
}
