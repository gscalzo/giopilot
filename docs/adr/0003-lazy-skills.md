# 0003 — Lazy skills: one-line manifest + `load_skill`

**Status:** Accepted

## Context

The Copilot SDK has its own skills feature, but it **eagerly preloads** each skill's full
content into context. Pi's design instead contributes a single line per skill and loads the
full instructions only when needed. We wanted Pi's lazy behaviour.

## Decision

Implement skills ourselves. Each turn, inject only a `- name: description` manifest. Expose a
single custom tool, `load_skill(name)`, that returns the full `SKILL.md` body on demand; the
`/skill:<name>` command forces it. Do not use the SDK's `skillDirectories` eager path.

## Consequences

- ✅ Per-turn context stays small regardless of how many skills exist.
- ✅ The model decides when a skill is relevant (or the user forces it).
- ❌ A skill is one round-trip slower than eager preload the first time it's used.
- ➡️ The same lazy pattern is reused for [memory](../memory.md).
