#!/usr/bin/env node
import { cleanupCodexAutoRead } from "./lib/codex-cleanup.mjs";

const actions = cleanupCodexAutoRead();

if (actions.length === 0) {
  process.stdout.write("No stale Codex Read Aloud auto-read state found.\n");
} else {
  for (const action of actions) {
    process.stdout.write(`${action}\n`);
  }
}

process.stdout.write("\nFully quit and restart Codex so any in-memory plugin hooks are unloaded.\n");
process.stdout.write("Claude support is not removed by this cleanup.\n");
