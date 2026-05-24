#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readWrapper, speakLatestAssistantMessage } from "./lib/read-aloud.mjs";

const wrapper = readWrapper();

await runPreviousNotify(wrapper.previousNotify);
await speakLatestAssistantMessage().catch((error) => {
  if (process.env.CODEX_READ_ALOUD_DEBUG === "1") {
    process.stderr.write(`[codex-read-aloud] ${error.stack || error.message}\n`);
  }
});

async function runPreviousNotify(previousNotify) {
  if (!Array.isArray(previousNotify) || previousNotify.length === 0) {
    return;
  }

  const [command, ...args] = previousNotify;
  if (!command || previousNotify.some((part) => String(part).includes("codex-read-aloud-notify.mjs"))) {
    return;
  }

  const result = spawnSync(command, [...args, ...process.argv.slice(2)], {
    env: process.env,
    stdio: "pipe",
    timeout: 5000
  });
  if (result.status !== 0) {
    process.stderr.write(`[codex-read-aloud] previous notify failed with status ${result.status ?? "unknown"}\n`);
  }
}
