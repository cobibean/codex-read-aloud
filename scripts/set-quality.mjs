#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { configPath, ensureRuntimeFiles, readConfig } from "./lib/read-aloud.mjs";

const preset = process.argv[2] || "macos-modern";

const presets = {
  "macos-modern": {
    provider: "macos",
    voice: "Samantha",
    rate: 185
  },
  "macos-calm": {
    provider: "macos",
    voice: "Shelley (English (US))",
    rate: 170
  },
  "openai-natural": {
    provider: "openai",
    openaiModel: "gpt-4o-mini-tts",
    openaiVoice: "coral",
    openaiSpeed: 1,
    openaiInstructions: "Speak naturally and warmly, like a calm coding partner reading a concise technical answer aloud. Avoid announcer energy. Keep code identifiers clear."
  },
  "openai-calm": {
    provider: "openai",
    openaiModel: "gpt-4o-mini-tts",
    openaiVoice: "sage",
    openaiSpeed: 0.95,
    openaiInstructions: "Speak in a relaxed, clear, conversational style. Pause lightly between ideas. Keep technical words precise and easy to follow."
  }
};

if (!presets[preset]) {
  process.stderr.write(`Unknown preset: ${preset}\nAvailable presets: ${Object.keys(presets).join(", ")}\n`);
  process.exit(1);
}

ensureRuntimeFiles();
const config = { ...readConfig(), ...presets[preset] };
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

process.stdout.write(`Applied ${preset} preset to ${configPath}\n`);
process.stdout.write(JSON.stringify(presets[preset], null, 2));
process.stdout.write("\n");
