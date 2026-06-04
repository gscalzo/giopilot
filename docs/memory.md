# Memory

[← Back to README](../README.md)

giopilot can remember durable facts across sessions. Two tools are always available to the
agent:

| Tool | Purpose |
|---|---|
| `remember` | Save a fact: `name`, `content`, optional `description` and `type`. |
| `recall` | Search saved memories by keyword and read them in full. |

## Storage

Each memory is a markdown file with frontmatter, plus a generated index:

```
.giopilot/memory/
├── prefers-dark-mode.md
├── deploy-runbook.md
└── MEMORY.md            # generated index, one line per memory
```

```markdown
---
name: Prefers dark mode
description: UI preference
type: user
---

The user prefers a dark theme everywhere.
```

`type` is one of `user`, `feedback`, `project`, `reference`. The directory is the project
`./.giopilot/memory/` when present, otherwise the global `~/.giopilot/memory/`.

## How it's used

Only the **one-line index** (`- name: description`) is injected into the prompt each turn —
the same lazy strategy as [skills](./skills.md). The agent reads a memory's full body on
demand with `recall`, and writes new ones with `remember`. This keeps long-term knowledge
available without spending context on it every turn.
