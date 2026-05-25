#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { chmod } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform !== "darwin") {
  process.stderr.write("The stop app is only supported on macOS.\n");
  process.exit(1);
}

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appRoot = resolve(homedir(), "Applications", "Stop Codex Read Aloud.app");
const contentsDir = resolve(appRoot, "Contents");
const macosDir = resolve(contentsDir, "MacOS");
const executablePath = resolve(macosDir, "stop-codex-read-aloud");
const plistPath = resolve(contentsDir, "Info.plist");

mkdirSync(macosDir, { recursive: true });

writeFileSync(executablePath, `#!/bin/zsh
exec /usr/bin/env node "${resolve(pluginRoot, "scripts", "stop.mjs")}"
`);

writeFileSync(plistPath, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>stop-codex-read-aloud</string>
  <key>CFBundleIdentifier</key>
  <string>local.codex-read-aloud.stop</string>
  <key>CFBundleName</key>
  <string>Stop Codex Read Aloud</string>
  <key>CFBundleDisplayName</key>
  <string>Stop Codex Read Aloud</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSMinimumSystemVersion</key>
  <string>12.0</string>
  <key>LSUIElement</key>
  <true/>
</dict>
</plist>
`);

await chmod(executablePath, 0o755);

process.stdout.write(`Installed stop app: ${appRoot}\n`);
process.stdout.write("Launch it from Spotlight, Raycast, Alfred, or bind it to a hotkey in your launcher.\n");
