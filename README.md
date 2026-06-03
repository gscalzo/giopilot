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
giopilot                 # interactive REPL
giopilot "list files"    # one-shot: run a single task, then exit
```

In the REPL:

| Command          | What it does                                            |
| ---------------- | ------------------------------------------------------- |
| `/skills`        | List available skills (one line each)                   |
| `/skill:<name>`  | Load a skill's full instructions and act on it          |
| `/<command>`     | Run an extension-registered command                     |
| `/help`          | Show help                                               |
| `/exit`, `/quit` | Leave giopilot                                          |

Anything else you type is sent to the agent as a prompt.

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

## Development

```bash
npm test               # run the Vitest suite
npm run test:coverage  # with coverage (≥80% enforced)
npm run dev -- "task"  # run from source via tsx
```

Built test-first (TDD). Core logic lives in small, unit-tested modules
(`config`, `systemPrompt`, `skills/*`, `extensions/*`, `harness`, `repl`).

## Roadmap

This is **Phase 1** (the simplistic Pi core). Planned additive phases:

- **Phase 2** — Ink TUI + runtime `/model` picker (`client.listModels()`).
- **Phase 3** — memory store (`remember`/`recall`) + permission gating.
- **Phase 4** — `giopilot update`, release CI, strict quality gates (coverage, complexity).

See `PLAN.md` for the full plan.

## License

MIT
