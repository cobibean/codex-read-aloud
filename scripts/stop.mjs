#!/usr/bin/env node
import { stopPreviousPlayback } from "./lib/read-aloud.mjs";

const stopped = stopPreviousPlayback();
process.stdout.write(stopped ? "Stopped Codex Read Aloud playback.\n" : "No active Codex Read Aloud playback found.\n");

