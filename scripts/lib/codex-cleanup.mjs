import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
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
  const configText = existsSync(codexConfigPath) ? readFileSync(codexConfigPath, "utf8") : "";
  const staleWrapper = readStaleWrapper(runtimeWrapperPath);
  const staleCache = cacheContainsAutoFiles(cachePath);
  const staleConfig = configHasReadAloudNotify(configText) || configHasReadAloudHookState(configText);
  const staleDetected = staleConfig || staleCache || Boolean(staleWrapper);

  if (stopPreviousPlayback()) {
    actions.push("Stopped active read-aloud playback.");
  }

  const codexCommand = options.codexCommand || findCodexCommand();
  if (staleDetected && codexCommand && codexReadAloudPluginInstalled(codexCommand)) {
    const result = spawnSync(codexCommand, ["plugin", "remove", "codex-read-aloud@plugins-cli"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    if (result.status === 0) {
      actions.push("Removed Codex plugin install: codex-read-aloud@plugins-cli.");
    }
  }

  if (staleConfig && existsSync(codexConfigPath)) {
    const before = readFileSync(codexConfigPath, "utf8");
    let after = restoreReadAloudNotify(before, staleWrapper?.previousNotify || []);
    after = removeCodexReadAloudBlocks(after).text;

    if (after !== before) {
      const backupPath = `${codexConfigPath}.backup-before-read-aloud-cleanup-${timestamp}`;
      copyFileSync(codexConfigPath, backupPath);
      writeFileSync(codexConfigPath, after);
      actions.push(`Cleaned stale Codex config. Backup: ${backupPath}`);
    }
  }

  if (staleCache && existsSync(cachePath)) {
    const disabledPath = `${cachePath}.disabled-${timestamp}`;
    renameSync(cachePath, disabledPath);
    actions.push(`Disabled stale Codex plugin cache: ${disabledPath}`);
  }

  if (staleWrapper && existsSync(runtimeWrapperPath)) {
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
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return false;
    }

    for (const entry of entries) {
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

function configHasReadAloudNotify(toml) {
  return toml.includes("codex-read-aloud-notify.mjs");
}

function configHasReadAloudHookState(toml) {
  return toml.includes("[hooks.state.\"codex-read-aloud@");
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
