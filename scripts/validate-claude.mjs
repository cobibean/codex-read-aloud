#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

runClaudeValidate(".");

const tempRoot = mkdtempSync(join(tmpdir(), "codex-read-aloud-claude-validate-"));
cpSync(".", tempRoot, {
  recursive: true,
  filter: (source) => !source.includes("node_modules") && !source.includes(".git/")
});
rmSync(join(tempRoot, ".claude-plugin", "marketplace.json"), { force: true });
runClaudeValidate(tempRoot);
rmSync(tempRoot, { recursive: true, force: true });

function runClaudeValidate(path) {
  const result = spawnSync("claude", ["plugin", "validate", path], {
    encoding: "utf8",
    stdio: "pipe"
  });

  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
