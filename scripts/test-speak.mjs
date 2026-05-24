#!/usr/bin/env node
import { readConfig, speakText } from "./lib/read-aloud.mjs";

const text = process.argv.slice(2).join(" ").trim() || "Codex Read Aloud is ready.";
const result = await speakText(text, readConfig());

if (result.reason === "dry-run") {
  process.exit(0);
}

process.stdout.write(result.spoken ? "Started speech playback.\n" : `Did not speak: ${result.reason || "unknown"}\n`);
