#!/usr/bin/env node
import { speakLatestCodexAssistantMessage } from "./lib/read-aloud.mjs";

const result = await speakLatestCodexAssistantMessage();
process.stdout.write(result.spoken ? "Started speech playback.\n" : `Did not speak: ${result.reason || "unknown"}\n`);

