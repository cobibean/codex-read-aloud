import { mkdtempSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import {
  getLatestAssistantMessage,
  getClaudeHookMessage,
  prepareSpeechText
} from "../scripts/lib/read-aloud.mjs";
import {
  isReadAloudNotify,
  readTopLevelNotifyConfig,
  replaceTopLevelNotifyConfig
} from "../scripts/lib/codex-config.mjs";

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

test("getClaudeHookMessage reads last_assistant_message", () => {
  const message = getClaudeHookMessage(JSON.stringify({
    hook_event_name: "Stop",
    last_assistant_message: "Here is the answer."
  }), { includeCodeBlocks: false, maxCharacters: 1000 });

  assert.equal(message.text, "Here is the answer.");
});

test("Codex notify parser preserves multiline TOML arrays", () => {
  const config = [
    "model = 'gpt-5.5'",
    "notify = [",
    "  '/usr/bin/env', # command",
    "  'node',",
    "  '/tmp/notifier.mjs'",
    "]",
    "",
    "[mcp]",
    "remote_mcp_client_enabled = true"
  ].join("\n");

  const parsed = readTopLevelNotifyConfig(config);
  assert.deepEqual(parsed.value, ["/usr/bin/env", "node", "/tmp/notifier.mjs"]);

  const next = replaceTopLevelNotifyConfig(config, ["/bin/echo", "ok"]);
  assert.match(next, /^notify = \["\/bin\/echo","ok"\]/m);
  assert.match(next, /\[mcp\]/);
});

test("isReadAloudNotify detects wrapper path", () => {
  assert.equal(isReadAloudNotify(["/usr/bin/env", "node", "/tmp/codex-read-aloud-notify.mjs"]), true);
  assert.equal(isReadAloudNotify(["/bin/echo", "ok"]), false);
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
