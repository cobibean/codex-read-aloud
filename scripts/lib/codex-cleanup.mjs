import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { stopPreviousPlayback, wrapperPath } from "./read-aloud.mjs";

export function cleanupCodexAutoRead(options = {}) {
  const home = options.home || homedir();
  const codexConfigPath = options.codexConfigPath || join(home, ".codex", "config.toml");
  const cachePath = options.cachePath || join(home, ".codex", "plugins", "cache", "plugins-cli", "codex-read-aloud");
  const runtimeWrapperPath = options.wrapperPath || wrapperPath;
  const now = options.now || new Date();
  const timestamp = formatTimestamp(now);
  const actions = [];

  if (stopPreviousPlayback()) {
    actions.push("Stopped active read-aloud playback.");
  }

  const codexCommand = options.codexCommand || findCodexCommand();
  if (codexCommand && codexReadAloudPluginInstalled(codexCommand)) {
    const result = spawnSync(codexCommand, ["plugin", "remove", "codex-read-aloud@plugins-cli"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    if (result.status === 0) {
      actions.push("Removed Codex plugin install: codex-read-aloud@plugins-cli.");
    }
  }

  if (existsSync(codexConfigPath)) {
    const before = readFileSync(codexConfigPath, "utf8");
    const wrapper = readStaleWrapper(runtimeWrapperPath);
    let after = restoreReadAloudNotify(before, wrapper?.previousNotify || []);
    after = removeCodexReadAloudBlocks(after).text;

    if (after !== before) {
      const backupPath = `${codexConfigPath}.backup-before-read-aloud-cleanup-${timestamp}`;
      copyFileSync(codexConfigPath, backupPath);
      writeFileSync(codexConfigPath, after);
      actions.push(`Cleaned stale Codex config. Backup: ${backupPath}`);
    }
  }

  if (existsSync(cachePath)) {
    const disabledPath = `${cachePath}.disabled-${timestamp}`;
    renameSync(cachePath, disabledPath);
    actions.push(`Disabled stale Codex plugin cache: ${disabledPath}`);
  }

  if (staleWrapperExists(runtimeWrapperPath)) {
    const disabledPath = `${runtimeWrapperPath}.disabled-${timestamp}`;
    renameSync(runtimeWrapperPath, disabledPath);
    actions.push(`Disabled stale notify wrapper state: ${disabledPath}`);
  }

  return actions;
}

export function removeCodexReadAloudBlocks(toml) {
  const lines = toml.split(/(?<=\n)/);
  const output = [];
  let changed = false;
  let skipping = false;

  for (const line of lines) {
    if (line.startsWith("[") && isCodexReadAloudTable(line)) {
      skipping = true;
      changed = true;
      continue;
    }

    if (skipping && line.startsWith("[")) {
      skipping = false;
    }

    if (!skipping) {
      output.push(line);
    }
  }

  return { text: output.join(""), changed };
}

export function restoreReadAloudNotify(toml, previousNotify) {
  const lines = toml.split(/(?<=\n)/);
  let changed = false;
  const output = lines.flatMap((line) => {
    if (!line.startsWith("notify =") || !line.includes("codex-read-aloud-notify.mjs")) {
      return [line];
    }

    changed = true;
    if (Array.isArray(previousNotify) && previousNotify.length > 0) {
      return [`notify = ${toTomlStringArray(previousNotify)}\n`];
    }
    return [];
  });

  return changed ? output.join("") : toml;
}

function isCodexReadAloudTable(line) {
  return line.startsWith("[plugins.\"codex-read-aloud@")
    || line.startsWith("[hooks.state.\"codex-read-aloud@");
}

function staleWrapperExists(path) {
  return Boolean(readStaleWrapper(path));
}

function readStaleWrapper(path) {
  if (!existsSync(path)) {
    return null;
  }

  try {
    const wrapper = JSON.parse(readFileSync(path, "utf8"));
    const text = JSON.stringify(wrapper);
    return text.includes("codex-read-aloud-notify.mjs") || text.includes("/codex-read-aloud/0.1.0")
      ? wrapper
      : null;
  } catch {
    return null;
  }
}

function toTomlStringArray(values) {
  return `[${values.map((value) => JSON.stringify(String(value))).join(", ")}]`;
}

function findCodexCommand() {
  for (const command of [
    "codex",
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
    "/Applications/Codex.app/Contents/Resources/codex"
  ]) {
    const result = spawnSync(command, ["--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    if (result.status === 0) {
      return command;
    }
  }
  return "";
}

function codexReadAloudPluginInstalled(codexCommand) {
  const result = spawnSync(codexCommand, ["plugin", "list"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  });
  if (result.status !== 0) {
    return false;
  }

  return result.stdout
    .split(/\r?\n/)
    .some((line) => line.includes("codex-read-aloud@") && line.includes("(installed"));
}

function formatTimestamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\..+/, "Z");
}
