# Agent Setup Instructions

Use this file when a user gives you this repository link and says "set this up".

## Goal

Install Codex Read Aloud so Codex and/or Claude Code reads assistant replies aloud at turn end. Keep setup simple and do not expose the user's OpenAI API key.

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

6. Tell the user to restart Codex or Claude Code so plugin and hook settings reload.

## Safety Rules

- Never paste, print, commit, or store the user's OpenAI API key in repo files.
- Do not ask the user to paste an OpenAI API key into chat.
- Prefer macOS Keychain for the key.
- Do not delete an existing Codex `notify` command. The installer stores and chains it.
- Do not claim streaming speech. This plugin speaks at turn end.
- If OpenAI TTS is not configured, the plugin falls back to macOS `say`.

## Useful Commands

```bash
node scripts/setup.mjs codex
node scripts/setup.mjs claude
node scripts/set-quality.mjs macos-modern
node scripts/set-quality.mjs openai-natural
node scripts/stop.mjs
node scripts/doctor.mjs
npm test
```
