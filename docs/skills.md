# Skills

[← Back to README](../README.md)

A **skill** is a folder with a `SKILL.md` file. Skills are how you give giopilot reusable,
task-specific instructions without bloating the system prompt.

## Layout

```
.giopilot/skills/
└── git-commit/
    └── SKILL.md
```

Skills are discovered from both `~/.giopilot/skills/` and `./.giopilot/skills/`; on a name
collision the project wins.

## Format

Optional YAML frontmatter gives the skill a `name` (defaults to the folder name) and a
one-line `description`:

```markdown
---
name: git-commit
description: Stage changes and write a clean Conventional Commit
---

# Git commit

1. Run `git status` and `git diff` to understand what changed.
2. Stage the relevant files.
3. Write a Conventional Commit message: `<type>(<scope>): <subject>`.
4. Show `git log -1` and stop. Do not push unless asked.
```

## Lazy loading (the Pi trick)

Every turn, giopilot injects only the **one-line manifest** — `- name: description` — for
each skill. The full body is loaded **on demand**:

- the model calls the `load_skill` tool when a task matches a skill, or
- you type `/skill:<name>` to force it.

This keeps the per-turn context small no matter how many skills you have. See
[ADR&nbsp;0003](./adr/0003-lazy-skills.md).
