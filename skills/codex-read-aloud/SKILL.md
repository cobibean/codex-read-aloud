---
name: codex-read-aloud
description: Manage the local Codex Read Aloud plugin that speaks Codex assistant responses on macOS. Use when the user asks to install, configure, test, disable, uninstall, debug, or explain Codex text-to-speech/read-aloud behavior.
---

# Codex Read Aloud

Use this skill when the user asks for Codex text-to-speech or read-aloud behavior.

## Plugin Paths

- Plugin root: `~/plugins/codex-read-aloud`
- Runtime config: `~/Library/Application Support/codex-read-aloud/config.json`
- Wrapper state: `~/Library/Application Support/codex-read-aloud/wrapper.json`
- Playback state: `~/Library/Application Support/codex-read-aloud/state.json`

## Common Tasks

Install for whichever supported agent CLIs are present:

```bash
node ~/plugins/codex-read-aloud/scripts/setup.mjs auto
```

Install or refresh the Codex notify wrapper:

```bash
node ~/plugins/codex-read-aloud/scripts/install-notify.mjs
```

Speak a short test phrase:

```bash
node ~/plugins/codex-read-aloud/scripts/test-speak.mjs
```

Use a less robotic local macOS voice:

```bash
node ~/plugins/codex-read-aloud/scripts/set-quality.mjs macos-modern
```

Use OpenAI TTS:

```bash
OPENAI_API_KEY="sk-..." node ~/plugins/codex-read-aloud/scripts/store-openai-key.mjs
node ~/plugins/codex-read-aloud/scripts/set-quality.mjs openai-natural
```

Install Claude Code integration:

```bash
node ~/plugins/codex-read-aloud/scripts/setup.mjs claude
```

Dry-run the latest detected assistant response:

```bash
CODEX_READ_ALOUD_DRY_RUN=1 node ~/plugins/codex-read-aloud/scripts/codex-read-aloud-notify.mjs
```

Disable and restore the previous Codex notify command:

```bash
node ~/plugins/codex-read-aloud/scripts/uninstall-notify.mjs
```

## Behavior

- The installer updates the top-level `notify` array in `~/.codex/config.toml`.
- The previous `notify` command is stored and chained first, so existing Codex behavior such as Computer Use turn-ended notifications is preserved.
- The wrapper reads the newest `.jsonl` file under `~/.codex/sessions`, extracts the newest assistant response, and speaks it with macOS `say` by default.
- Claude Code uses the plugin `Stop` hook and the `last_assistant_message` hook input field.
- Restart Codex after install or uninstall so the app reloads `~/.codex/config.toml`.

## Configuration

Edit `~/Library/Application Support/codex-read-aloud/config.json`.

Important fields:

- `provider`: `macos` or `openai`
- `voice`: macOS voice name for `say`
- `rate`: macOS speech rate
- `openaiVoice`: OpenAI TTS voice, such as `coral`, `sage`, `verse`, or `nova`
- `openaiInstructions`: style guidance sent to `gpt-4o-mini-tts`
- `speakMode`: `final` for only final assistant messages, `all` for newest assistant message
- `maxCharacters`: maximum text length spoken
- `includeCodeBlocks`: whether fenced code blocks should be spoken
- `stopPrevious`: whether a prior speech process started by this plugin should be stopped before new speech

OpenAI TTS mode first checks `OPENAI_API_KEY`, then checks macOS Keychain for service `codex-read-aloud-openai-api-key` and account `codex-read-aloud`.
