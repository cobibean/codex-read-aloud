# Launch Notes

## One-Line Pitch

Codex Read Aloud makes Codex and Claude Code read replies out loud on demand with macOS speech or high-quality OpenAI TTS.

## Who It Is For

- People who dictate prompts and want the agent to speak back.
- Developers who prefer audio feedback while coding.
- Accessibility-minded users who want less screen fixation during long agent sessions.

## Twitter/X Draft

I made a tiny macOS plugin that lets Codex and Claude Code read replies aloud on demand.

It does not auto-read every chat. Ask your agent to use it when you want audio, stop it whenever, and use either built-in macOS voices or OpenAI TTS.

Setup is meant to be agent-friendly: paste the repo link to your agent and say "set this up".

Repo: https://github.com/cobibean/codex-read-aloud

## Release Checklist

- [ ] Public GitHub repo exists.
- [ ] README quick start works from a fresh clone.
- [ ] `node scripts/doctor.mjs` passes core checks.
- [ ] `npm test` passes.
- [ ] Maintainer-only `npm run validate:maintainer` passes in a Codex + Claude Code environment.
- [ ] README explains safe OpenAI API key storage.
