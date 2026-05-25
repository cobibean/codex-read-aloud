# Agent Setup Instructions

Use this file when a user gives you this repository link and says "set this up".

## Goal

Install Codex Read Aloud so Codex and/or Claude Code can read assistant replies aloud on demand. Keep setup simple and do not expose the user's OpenAI API key.

This plugin supports both Codex and Claude Code, but it must not be automatic by default. Keep the Claude plugin installed/enabled so the skill is available. Do not add Claude hooks, watchers, or Codex `notify` changes unless the user explicitly asks for automatic read-aloud.

## Fast Path

1. Clone the repository:

   ```bash
   git clone https://github.com/cobibean/codex-read-aloud.git ~/plugins/codex-read-aloud
   cd ~/plugins/codex-read-aloud
   ```

2. Run setup:

   ```bash
   node scripts/setup.mjs auto
   ```

3. Do not ask for or handle the user's OpenAI API key. The default macOS voice works without a key. Run the local checks first:

   ```bash
   node scripts/doctor.mjs
   node scripts/test-speak.mjs
   ```

4. Offer OpenAI TTS only after local setup works. Tell the user not to paste their key into agent chat and to run this locally:

   ```bash
   node scripts/store-openai-key.mjs
   node scripts/set-quality.mjs openai-natural
   ```

5. Run:

   ```bash
   node scripts/doctor.mjs
   npm test
   ```

6. Tell the user how to invoke it on demand:

   ```bash
   node scripts/speak-text.mjs "Text to read aloud"
   node scripts/speak-latest-codex.mjs
   node scripts/stop.mjs
   ```

   Tell the user they can ask "stop read aloud" while it is talking, and the agent should run `node scripts/stop.mjs`.

## Safety Rules

- Never paste, print, commit, or store the user's OpenAI API key in repo files.
- Do not ask the user to paste an OpenAI API key into chat.
- Prefer macOS Keychain for the key.
- Do not edit Codex `notify` unless the user explicitly asks for automatic read-aloud.
- Do not disable Claude support. Claude should remain able to use the plugin on demand.
- Do not add Claude hooks unless the user explicitly asks for automatic read-aloud.
- Do not claim streaming speech. This plugin speaks on demand.
- Always tell users how to stop playback: `node scripts/stop.mjs`.
- If OpenAI TTS is not configured, the plugin falls back to macOS `say`.

## Useful Commands

```bash
node scripts/setup.mjs codex
node scripts/setup.mjs claude
node scripts/set-quality.mjs macos-modern
node scripts/set-quality.mjs openai-natural
node scripts/speak-text.mjs "Text to read aloud"
node scripts/speak-latest-codex.mjs
node scripts/stop.mjs
node scripts/doctor.mjs
npm test
```
