# Codex Read Aloud

Read Codex and Claude Code replies aloud on macOS.

Codex Read Aloud is for people who can dictate prompts but want the agent to speak back. It speaks at turn end, uses built-in macOS voices by default, and can use OpenAI TTS for a much more natural voice.

## Requirements

- macOS
- Node.js 20+
- Codex and/or Claude Code installed
- OpenAI API key optional; only needed for OpenAI TTS

## Quick Start

Paste this repo link to your agent and say:

```text
Set this up: https://github.com/cobibean/codex-read-aloud
```

Or run it yourself:

```bash
git clone https://github.com/cobibean/codex-read-aloud.git ~/plugins/codex-read-aloud
cd ~/plugins/codex-read-aloud
node scripts/setup.mjs auto
node scripts/test-speak.mjs
```

Restart Codex or Claude Code after installing so plugin and hook settings reload.

## High Quality Voice

The default uses a local macOS voice and does not need an API key. For a more natural voice, store your OpenAI API key in macOS Keychain and enable OpenAI TTS.

Do not paste your OpenAI API key into agent chat. Run this locally in your terminal:

```bash
node scripts/store-openai-key.mjs
node scripts/set-quality.mjs openai-natural
```

The key is stored in Keychain under `codex-read-aloud-openai-api-key`. It is not written to this repo, Codex config, Claude settings, or a `.env` file.

## Install For Codex

```bash
node scripts/setup.mjs codex
```

Codex setup installs a wrapper around the top-level `notify` command in `~/.codex/config.toml`. If you already have a notify command, it is preserved and chained before speech.

## Install For Claude Code

From a local clone:

```bash
node scripts/setup.mjs claude
```

From GitHub after this repo is public:

```bash
claude plugin marketplace add cobibean/codex-read-aloud
claude plugin install codex-read-aloud@codex-read-aloud
```

Claude Code setup uses the plugin `Stop` hook and reads the `last_assistant_message` hook field. No transcript parsing is needed for Claude Code.

## Commands

```bash
# Install for whichever agent CLIs are present.
node scripts/setup.mjs auto

# Install only one integration.
node scripts/setup.mjs codex
node scripts/setup.mjs claude

# Speak a sample sentence.
node scripts/test-speak.mjs

# Print the latest detected assistant message without speaking.
CODEX_READ_ALOUD_DRY_RUN=1 node scripts/codex-read-aloud-notify.mjs

# Switch voices.
node scripts/set-quality.mjs macos-modern
node scripts/set-quality.mjs openai-natural

# Stop current playback.
node scripts/stop.mjs

# Check setup.
node scripts/doctor.mjs

# Run public tests.
npm test

# Run maintainer validation when Codex and Claude validators are installed.
npm run validate:maintainer

# Restore the previous Codex notify command.
node scripts/uninstall-notify.mjs
```

## Configuration

Runtime settings live at:

```text
~/Library/Application Support/codex-read-aloud/config.json
```

Default settings:

```json
{
  "provider": "macos",
  "voice": "Sandy (English (US))",
  "rate": 175,
  "speakMode": "final",
  "maxCharacters": 3000,
  "includeCodeBlocks": false,
  "stopPrevious": true
}
```

`provider: "macos"` uses the built-in macOS `say` command. `provider: "openai"` uses OpenAI text-to-speech and is much more natural for longer replies.

## Presets

- `macos-modern`: free, local, decent Apple voice
- `macos-calm`: free, local, alternate Apple voice
- `openai-natural`: best default OpenAI TTS preset
- `openai-calm`: slower OpenAI TTS preset

```bash
node scripts/set-quality.mjs openai-natural
```

## Agent Setup

See [AGENTS.md](AGENTS.md). It is written for coding agents so a user can paste the repo link and say "set this up".

## Privacy

See [docs/PRIVACY.md](docs/PRIVACY.md).

## Notes

This is turn-end read aloud, not streaming speech. Codex uses the local session log plus Codex's existing notify mechanism. Claude Code uses its `Stop` hook.
