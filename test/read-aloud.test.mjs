import { mkdtempSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import {
  getLatestAssistantMessage,
  prepareSpeechText,
  speakText
} from "../scripts/lib/read-aloud.mjs";

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
