#!/usr/bin/env node
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { readWrapper } from "./lib/read-aloud.mjs";
import { isReadAloudNotify, readTopLevelNotifyConfig, replaceTopLevelNotifyConfig } from "./lib/codex-config.mjs";

const configPath = resolve(homedir(), ".codex", "config.toml");
const wrapper = readWrapper();

if (!existsSync(configPath)) {
  throw new Error(`Codex config not found: ${configPath}`);
}

if (!Array.isArray(wrapper.previousNotify)) {
  throw new Error("No previous notify command was recorded.");
}

const configText = readFileSync(configPath, "utf8");
const currentNotify = readTopLevelNotifyConfig(configText).value;

if (!isReadAloudNotify(currentNotify)) {
  throw new Error("Codex notify no longer points at Codex Read Aloud. Refusing to overwrite the current notify command.");
}

const nextConfigText = wrapper.previousNotify.length > 0
  ? replaceTopLevelNotifyConfig(configText, wrapper.previousNotify)
  : removeTopLevelNotify(configText);

const backupPath = `${configPath}.backup-before-codex-read-aloud-uninstall-${timestamp()}`;
copyFileSync(configPath, backupPath);
writeFileSync(configPath, nextConfigText);

process.stdout.write(`Restored previous notify command in ${configPath}\nBackup: ${backupPath}\nRestart Codex so the app reloads the notify command.\n`);

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
}

function removeTopLevelNotify(text) {
  const current = readTopLevelNotifyConfig(text);
  if (!current.range) {
    return text;
  }
  return `${text.slice(0, current.range.start)}${text.slice(current.range.end)}`;
}
