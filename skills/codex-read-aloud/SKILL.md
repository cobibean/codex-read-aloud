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

Install for whichever supported agent CLIs are present. This must remain on-demand only; keep Claude support enabled but do not add hooks or Codex notify changes unless the user explicitly asks for automatic read-aloud.

```bash
node ~/plugins/codex-read-aloud/scripts/setup.mjs auto
```

Speak a short test phrase:

```bash
node ~/plugins/codex-read-aloud/scripts/speak-text.mjs "Codex Read Aloud is ready."
```

Use the user's system-selected macOS voice:

```bash
node ~/plugins/codex-read-aloud/scripts/set-quality.mjs macos-modern
```

Use a slower local macOS voice:

```bash
node ~/plugins/codex-read-aloud/scripts/set-quality.mjs macos-calm
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

Claude support means the plugin skill is available and Claude can run the on-demand speech scripts when asked. It does not mean every Claude response should be spoken automatically.

Speak the latest detected Codex assistant response on demand:

```bash
node ~/plugins/codex-read-aloud/scripts/speak-latest-codex.mjs
```

Stop current playback:

```bash
node ~/plugins/codex-read-aloud/scripts/stop.mjs
```

Disable stale automatic read-aloud state from early releases:

```bash
node ~/plugins/codex-read-aloud/scripts/emergency-disable-codex-auto.mjs
```

Install a launcher-friendly stop app:

```bash
node ~/plugins/codex-read-aloud/scripts/install-stop-app.mjs
```

## Behavior

- Setup does not update Codex `notify`.
- Setup does not install Claude Code hooks.
- `speak-latest-codex.mjs` reads the newest `.jsonl` file under `~/.codex/sessions`, extracts the newest assistant response, and speaks it only when invoked.
- `speak-text.mjs` speaks text explicitly passed by an agent or user.
- `stop.mjs` stops the current playback process started by this plugin.
- `emergency-disable-codex-auto.mjs` removes stale Codex plugin hook/cache/notify state from early releases and stops active playback. It does not remove Claude support from the repo.
- `install-stop-app.mjs` creates `~/Applications/Stop Codex Read Aloud.app` for Spotlight/Raycast/Alfred or launcher hotkeys.

## Configuration

Edit `~/Library/Application Support/codex-read-aloud/config.json`.

Important fields:

- `provider`: `macos` or `openai`
- `voice`: `system` for the user's system-selected voice, a macOS voice name for `say`, or `auto` to choose the best installed voice from `voicePreference`
- `voicePreference`: ordered list of macOS voices to try when `voice` is `auto`
- `rate`: macOS speech rate
- `openaiVoice`: OpenAI TTS voice, such as `coral`, `sage`, `verse`, or `nova`
- `openaiInstructions`: style guidance sent to `gpt-4o-mini-tts`
- `speakMode`: `final` for only final assistant messages, `all` for newest assistant message
- `maxCharacters`: maximum text length spoken
- `includeCodeBlocks`: whether fenced code blocks should be spoken
- `stopPrevious`: whether a prior speech process started by this plugin should be stopped before new speech

OpenAI TTS mode first checks `OPENAI_API_KEY`, then checks macOS Keychain for service `codex-read-aloud-openai-api-key` and account `codex-read-aloud`.
