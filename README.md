# Codex Read Aloud

Read Codex and Claude Code replies aloud on demand on macOS.

Codex Read Aloud is for people who can dictate prompts but want the agent to speak back when asked. It does not auto-read every chat. It uses built-in macOS voices by default and can use OpenAI TTS for a much more natural voice.

This plugin is intentionally **on-demand by default**. Installing it does not register Claude hooks, change Codex `notify`, or make every chat start talking.

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
```

Then invoke it from a chat by asking your agent to use Codex Read Aloud, or run one of the on-demand commands below.

Optional test:

```bash
node scripts/speak-text.mjs "Codex Read Aloud is installed."
```

To stop playback while it is talking:

```bash
node scripts/stop.mjs
```

For a non-terminal stop button on macOS:

```bash
node scripts/install-stop-app.mjs
```

That creates `~/Applications/Stop Codex Read Aloud.app`, which can be launched from Spotlight, Raycast, Alfred, or bound to a hotkey in your launcher.

## Emergency Cleanup For Early Installs

Versions before `0.1.1` briefly experimented with automatic Codex/Claude hooks. Current versions are on-demand only. If you installed an early version and Codex or Claude starts speaking without being asked, run:

```bash
cd ~/plugins/codex-read-aloud
git pull --ff-only
node scripts/emergency-disable-codex-auto.mjs
```

Then fully quit and restart Codex or Claude Code. The cleanup removes stale Codex hook/cache/notify state and stops active playback. It does not remove Claude support from the repo.

## High Quality Voice

The default uses a local macOS voice and does not need an API key. For a more natural voice, store your OpenAI API key in macOS Keychain and enable OpenAI TTS.

Do not paste your OpenAI API key into agent chat. Run this locally in your terminal:

```bash
node scripts/store-openai-key.mjs
node scripts/set-quality.mjs openai-natural
```

The key is stored in Keychain under `codex-read-aloud-openai-api-key`. It is not written to this repo, Codex config, Claude settings, or a `.env` file.

## Use With Codex

```bash
node scripts/setup.mjs codex
node scripts/speak-latest-codex.mjs
```

Codex setup does not edit `~/.codex/config.toml`. `speak-latest-codex.mjs` is an on-demand command that reads the latest local Codex assistant message.

## Use With Claude Code

From a local clone:

```bash
node scripts/setup.mjs claude
```

From GitHub after this repo is public:

```bash
claude plugin marketplace add cobibean/codex-read-aloud
claude plugin install codex-read-aloud@codex-read-aloud
```

Claude setup installs and enables the plugin so Claude can use its skill/instructions. It does not install a `Stop` hook, so Claude will not read every response automatically. Ask Claude to use Codex Read Aloud when you want speech.

Example:

```text
Use Codex Read Aloud to read that answer aloud.
```

## Commands

```bash
# Install for whichever agent CLIs are present.
node scripts/setup.mjs auto

# Install only one integration.
node scripts/setup.mjs codex
node scripts/setup.mjs claude

# Speak text on demand.
node scripts/speak-text.mjs "Text to read aloud"

# Speak the latest local Codex assistant message on demand.
node scripts/speak-latest-codex.mjs

# Switch voices.
node scripts/set-quality.mjs macos-modern
node scripts/set-quality.mjs openai-natural

# Stop current playback.
node scripts/stop.mjs

# Disable stale auto-read state from early releases.
node scripts/emergency-disable-codex-auto.mjs

# Install a Spotlight/Raycast/Alfred-launchable stop app.
node scripts/install-stop-app.mjs

# Check setup.
node scripts/doctor.mjs

# Run public tests.
npm test

# Run maintainer validation when Codex and Claude validators are installed.
npm run validate:maintainer

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
  "voice": "Samantha",
  "rate": 185,
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

## Agent Invocation

After installation, invoke it in a chat with something like:

```text
Use Codex Read Aloud to read your answer aloud.
```

Agents should run `node scripts/speak-text.mjs` with the text to speak, or `node scripts/speak-latest-codex.mjs` for the newest Codex response.

To stop playback, agents should run:

```bash
node scripts/stop.mjs
```

For users who want a quick stop action outside chat, agents should offer:

```bash
node scripts/install-stop-app.mjs
```

Then the user can launch `Stop Codex Read Aloud` from Spotlight/Raycast/Alfred or bind it to a launcher hotkey.

See [AGENTS.md](AGENTS.md). It is written for coding agents so a user can paste the repo link and say "set this up".

## Privacy

See [docs/PRIVACY.md](docs/PRIVACY.md).

## Notes

This is on-demand read aloud, not streaming speech. Codex latest-response mode reads the local session log only when you run the command.
