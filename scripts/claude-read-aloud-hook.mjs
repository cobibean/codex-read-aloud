#!/usr/bin/env node
import { readStdin, speakClaudeHookInput } from "./lib/read-aloud.mjs";

const input = await readStdin();

await speakClaudeHookInput(input).catch((error) => {
  if (process.env.CODEX_READ_ALOUD_DEBUG === "1") {
    process.stderr.write(`[codex-read-aloud] ${error.stack || error.message}\n`);
  }
});

