import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPlaybackState,
  getLatestAssistantMessage,
  prepareSpeechText,
  resolveMacOSVoice,
  speakText
} from "../scripts/lib/read-aloud.mjs";
import {
  removeCodexReadAloudBlocks,
  restoreReadAloudNotify
} from "../scripts/lib/codex-cleanup.mjs";

test("prepareSpeechText removes markdown and code blocks by default", () => {
  const text = prepareSpeechText("## Done\n\nHere is `thing`.\n\n```js\nsecret()\n```\n\n[link](https://example.com)", {
    includeCodeBlocks: false,
    maxCharacters: 1000
  });

  assert.equal(text, "Done Here is thing. Code block omitted. link");
});

test("getLatestAssistantMessage prefers final assistant messages", () => {
  const dir = mkdtempSync(join(tmpdir(), "codex-read-aloud-test-"));
  const session = join(dir, "session.jsonl");
  writeFileSync(session, [
    JSON.stringify({
      type: "response_item",
      payload: {
        type: "message",
        role: "assistant",
        phase: "commentary",
        content: [{ type: "output_text", text: "working" }]
      }
    }),
    JSON.stringify({
      type: "response_item",
      payload: {
        type: "message",
        role: "assistant",
        phase: "final",
        content: [{ type: "output_text", text: "done" }]
      }
    })
  ].join("\n"));

  const message = getLatestAssistantMessage(session, { speakMode: "final", includeCodeBlocks: false, maxCharacters: 1000 });
  assert.equal(message.text, "done");
});

test("store-openai-key ignores argv secrets", () => {
  const result = spawnSync(process.execPath, ["scripts/store-openai-key.mjs", "sk-should-not-be-used"], {
    cwd: join(import.meta.dirname, ".."),
    input: "",
    encoding: "utf8",
    env: { ...process.env, OPENAI_API_KEY: "" }
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /No API key provided/);
});

test("speakText dry-run reads text without auto hooks", async () => {
  const previous = process.env.CODEX_READ_ALOUD_DRY_RUN;
  const previousWrite = process.stdout.write;
  process.env.CODEX_READ_ALOUD_DRY_RUN = "1";
  process.stdout.write = () => true;
  try {
    const result = await speakText("hello", {});
    assert.equal(result.reason, "dry-run");
  } finally {
    process.env.CODEX_READ_ALOUD_DRY_RUN = previous;
    process.stdout.write = previousWrite;
  }
});

test("buildPlaybackState stores pid for stop command", () => {
  const state = buildPlaybackState({ existing: true }, {
    pid: 12345,
    provider: "macos",
    startedAt: "2026-01-01T00:00:00.000Z"
  });

  assert.equal(state.existing, true);
  assert.equal(state.playback.pid, 12345);
  assert.equal(state.playback.provider, "macos");
});

test("buildPlaybackState preserves stop lookup hints", () => {
  const state = buildPlaybackState({}, {
    pid: 12345,
    provider: "openai",
    audioPath: "/tmp/codex-read-aloud-example.mp3",
    textNeedle: "hello world"
  });

  assert.equal(state.playback.audioPath, "/tmp/codex-read-aloud-example.mp3");
  assert.equal(state.playback.textNeedle, "hello world");
});

test("resolveMacOSVoice chooses preferred installed voice for auto", () => {
  const voice = resolveMacOSVoice("auto", [
    "Missing Voice",
    "Shelley (English (US))",
    "Samantha"
  ], [
    { name: "Samantha", locale: "en_US" },
    { name: "Shelley (English (US))", locale: "en_US" }
  ]);

  assert.equal(voice, "Shelley (English (US))");
});

test("resolveMacOSVoice preserves explicit installed voice", () => {
  const voice = resolveMacOSVoice("Samantha", ["Shelley (English (US))"], [
    { name: "Samantha", locale: "en_US" },
    { name: "Shelley (English (US))", locale: "en_US" }
  ]);

  assert.equal(voice, "Samantha");
});

test("install-stop-app script exists", () => {
  assert.equal(existsSync(join(import.meta.dirname, "..", "scripts", "install-stop-app.mjs")), true);
});

test("emergency cleanup script exists", () => {
  assert.equal(existsSync(join(import.meta.dirname, "..", "scripts", "emergency-disable-codex-auto.mjs")), true);
});

test("removeCodexReadAloudBlocks removes stale plugin and hook state only", () => {
  const input = [
    "[plugins.\"codex-read-aloud@plugins-cli\"]\n",
    "enabled = true\n",
    "\n",
    "[plugins.\"browser@openai-bundled\"]\n",
    "enabled = true\n",
    "\n",
    "[hooks.state.\"codex-read-aloud@plugins-cli:hooks/hooks.json:stop:0:0\"]\n",
    "trusted_hash = \"sha256:bad\"\n",
    "\n",
    "[hooks.state.\"vercel-plugin@plugins-cli:hooks/hooks.json:post_tool_use:0:0\"]\n",
    "trusted_hash = \"sha256:good\"\n"
  ].join("");

  const result = removeCodexReadAloudBlocks(input);
  assert.equal(result.changed, true);
  assert.equal(result.text.includes("codex-read-aloud@plugins-cli"), false);
  assert.equal(result.text.includes("[plugins.\"browser@openai-bundled\"]"), true);
  assert.equal(result.text.includes("vercel-plugin@plugins-cli"), true);
});

test("restoreReadAloudNotify restores previous notify command", () => {
  const input = "model = \"gpt-5\"\nnotify = [\"/usr/bin/env\", \"node\", \"/tmp/codex-read-aloud-notify.mjs\"]\n";
  const output = restoreReadAloudNotify(input, ["/usr/bin/true", "turn-ended"]);
  assert.equal(output, "model = \"gpt-5\"\nnotify = [\"/usr/bin/true\", \"turn-ended\"]\n");
});
