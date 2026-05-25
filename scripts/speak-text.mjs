#!/usr/bin/env node
import { readStdin, readConfig, speakText } from "./lib/read-aloud.mjs";

const argText = process.argv.slice(2).join(" ").trim();
const stdinText = process.stdin.isTTY ? "" : await readStdin();
const text = argText || stdinText.trim();

if (!text) {
  process.stderr.write("Usage: node scripts/speak-text.mjs \"text to read\" OR echo \"text\" | node scripts/speak-text.mjs\n");
  process.exit(1);
}

const result = await speakText(text, readConfig());
process.stdout.write(result.spoken ? "Started speech playback.\n" : `Did not speak: ${result.reason || "unknown"}\n`);

