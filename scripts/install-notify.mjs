#!/usr/bin/env node
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureRuntimeFiles, readWrapper, writeWrapper } from "./lib/read-aloud.mjs";
import { isReadAloudNotify, readTopLevelNotifyConfig, replaceTopLevelNotifyConfig } from "./lib/codex-config.mjs";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = resolve(homedir(), ".codex", "config.toml");
const notifyCommand = ["/usr/bin/env", "node", resolve(pluginRoot, "scripts", "codex-read-aloud-notify.mjs")];

if (!existsSync(configPath)) {
  throw new Error(`Codex config not found: ${configPath}`);
}

ensureRuntimeFiles();

const configText = readFileSync(configPath, "utf8");
const currentNotify = readTopLevelNotifyConfig(configText).value;
const wrapper = readWrapper();
const alreadyInstalled = arraysEqual(currentNotify, notifyCommand);
const previousNotify = alreadyInstalled || isReadAloudNotify(currentNotify) ? wrapper.previousNotify : currentNotify;

if (!Array.isArray(previousNotify) || previousNotify.length === 0) {
  process.stderr.write("[codex-read-aloud] No existing notify command found. Installing read-aloud as the only notify command.\n");
}

const nextConfigText = replaceTopLevelNotifyConfig(configText, notifyCommand);
if (nextConfigText !== configText) {
  const backupPath = `${configPath}.backup-before-codex-read-aloud-${timestamp()}`;
  copyFileSync(configPath, backupPath);
  writeFileSync(configPath, nextConfigText);
  process.stdout.write(`Updated ${configPath}\nBackup: ${backupPath}\n`);
} else {
  process.stdout.write(`Already installed in ${configPath}\n`);
}

writeWrapper({
  ...wrapper,
  pluginRoot,
  configPath,
  notifyCommand,
  previousNotify: Array.isArray(previousNotify) ? previousNotify : [],
  installedAt: new Date().toISOString()
});

process.stdout.write("Restart Codex so the app reloads the notify command.\n");

function arraysEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
}
