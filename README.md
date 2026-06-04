# giopilot

A simplistic, [Pi](https://pi.dev/)-style coding agent harness powered by the
[**GitHub Copilot SDK**](https://github.com/github/copilot-sdk).

giopilot keeps a tiny core and makes Copilot *feel* like Pi: a minimal system prompt,
lazily-injected **skills**, and an in-process TypeScript **extension** mechanism. The
Copilot SDK owns the agent loop (planning, tool calls, file edits, built-in
Read/Write/Edit/Bash); giopilot wraps it and controls the prompt, the tools, the skills,
and the extension surface around it.

## Prerequisites

- **Node.js ≥ 20**
- A **GitHub Copilot subscription** and authentication. The Copilot SDK manages the bundled
  Copilot CLI; on first run it may prompt you to authenticate (GitHub OAuth, or BYOK via
  environment variables).

## Install

```bash
npm install        # install dependencies
npm run build      # compile to dist/
npm link           # put `giopilot` on your PATH (or: npm i -g .)
```

## Usage

```bash
giopilot                        # interactive TUI (Ink)
giopilot "list files"           # one-shot: run a single task, then exit
giopilot --model gpt-5-mini     # start the TUI with a specific model
```

In the TUI:

| Command          | What it does                                            |
| ---------------- | ------------------------------------------------------- |
| `/skills`        | List available skills (one line each)                   |
| `/skill:<name>`  | Load a skill's full instructions and act on it          |
| `/model`         | Open a picker to switch the model (from `listModels()`) |
| `/<command>`     | Run an extension-registered command                     |
| `/help`          | Show help                                               |
| `/exit`, `/quit` | Leave giopilot                                          |

Anything else you type is sent to the agent as a prompt. The header shows the current
model and status; assistant text streams in, with tool calls shown as dim notices.

## Configuration layout

giopilot reads configuration from a global and a project directory; **project overrides
global**.

```
~/.giopilot/            # global
./.giopilot/            # project (current working directory)
├── settings.json       # { "model": "auto" }
├── skills/
│   └── <name>/SKILL.md
└── extensions/
    └── *.ts | *.mjs | *.js
```

### Skills (lazy, Pi-style)

A skill is a folder with a `SKILL.md` file. Optional YAML frontmatter gives it a `name`
(defaults to the folder name) and a one-line `description`:

```markdown
---
name: git-commit
description: Stage changes and write a clean Conventional Commit
---

# Git commit
1. Run `git status` and `git diff` ...
```

Every turn, only the one-line `- name: description` manifest is injected into the prompt.
The full body is loaded **on demand** — either when the model calls the `load_skill` tool,
or when you type `/skill:<name>`. This keeps the context small.

### Extensions

An extension is a module with a default export that receives the `HarnessAPI`:

```ts
import { defineTool } from "@github/copilot-sdk";
import type { HarnessAPI } from "giopilot";

export default function (gio: HarnessAPI) {
  // a slash command: /ping
  gio.registerCommand("ping", (args, ctx) => ctx.print("pong"));

  // an LLM-callable tool
  gio.registerTool(
    defineTool("now", {
      description: "Return the current time.",
      parameters: { type: "object", properties: {} },
      handler: () => ({ now: new Date().toISOString() }),
    }),
  );

  // append to the system prompt
  gio.addSystemPrompt("When the user asks for the time, call the `now` tool.");
}
```

A failing extension is reported, never fatal — one bad module won't take down the harness.

### Memory

giopilot can remember durable facts across sessions. The agent has two tools:

- `remember` — save a fact (`name`, `content`, optional `description`/`type`).
- `recall` — search saved memories and read them in full.

Memories are stored as `memory/<slug>.md` (with frontmatter) plus a generated `MEMORY.md`
index, under the project `.giopilot/memory/` if present, else `~/.giopilot/memory/`. The
one-line index is injected into the prompt each turn; full content is loaded on `recall`.

### Permissions

By default giopilot approves all tool requests. You can restrict kinds in `settings.json`:

```json
{
  "model": "auto",
  "permissions": { "shell": "deny", "url": "deny" }
}
```

Kinds: `shell`, `write`, `read`, `url`, `mcp`, `custom-tool`, `memory`, `hook`. Extensions
can also add fine-grained gates via `gio.gatePermission(req => …)`; gates run first, then
the settings policy.

## Development

```bash
npm test               # run the Vitest suite
npm run test:coverage  # with coverage (≥80% enforced)
npm run lint           # ESLint (incl. cyclomatic complexity ≤ 5)
npm run check          # lint + typecheck + coverage (the full gate)
npm run dev -- "task"  # run from source via tsx
```

Built test-first (TDD). Core logic lives in small, unit-tested modules
(`config`, `systemPrompt`, `skills/*`, `extensions/*`, `memory/*`, `permissions`,
`version`, `harness`, `repl`, `ui/controller`).

**Quality gates** run both locally (Husky `pre-commit` → `npm run check`) and in CI
(`.github/workflows/ci.yml`): ESLint clean, cyclomatic complexity `< 6`, and test coverage
`≥ 80%`. Tagging `vX.Y.Z` triggers `release.yml` to publish to npm and cut a GitHub Release
(needs an `NPM_TOKEN` secret).

## Roadmap

- **Phase 1** ✅ — simplistic Pi core: minimal prompt, lazy skills, extensions, wrap the SDK loop.
- **Phase 2** ✅ — Ink TUI + `/model` picker (`client.listModels()`) + `--model` flag + command autocomplete.
- **Phase 3** ✅ — memory store (`remember`/`recall`, `memory/*.md` + `MEMORY.md` index) + permission gating.
- **Phase 4** ✅ — `giopilot update`, release CI, strict quality gates (lint, coverage ≥80%, complexity).

See `PLAN.md` for the full plan.

## License

MIT
