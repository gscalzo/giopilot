# giopilot — a minimal, Pi-style agentic coding harness on the GitHub Copilot SDK

## Context

A small, hackable terminal coding agent ("giopilot") with **Pi's philosophy** (tiny core,
a minimal system prompt, configured skills, an extension mechanism, a memory store) but
powered by the **GitHub Copilot SDK** (`@github/copilot-sdk`). The SDK exposes a *managed*
agent session (it owns the plan→tool→edit loop and built-in Read/Write/Edit/Bash tools);
we **wrap** that loop and layer Pi-style ergonomics on top.

Locked decisions:
- **Wrap Copilot's managed loop** (the SDK gives no raw token streams — managed only).
- **TypeScript / Node**, distributed as an **installable `giopilot` CLI** (npm bin).
- **Rich TUI built on Ink** (React for the terminal) — not plain readline.
- **Model selection** at runtime via the SDK's `client.listModels()` + `/model` picker,
  with a default in settings and a `--model` flag.
- **Pi-style lazy skills**: one line per skill per turn; full `SKILL.md` loaded on demand.
- **Minimal system prompt** (<1000 tokens), like Pi.
- **Memory subsystem**: multi-file markdown store + index, with `remember`/`recall` tools.
- **Self-update**: `giopilot update` checks the npm registry (and GitHub Releases) for a
  newer version; a GitHub Action bumps the version, publishes to npm, and cuts a Release.
- **TDD + full coverage**: every unit written test-first with **Vitest**; aim ~100% on
  core logic. **Quality gates** (lint, coverage ≥80%, cyclomatic complexity <5) enforced
  by a **pre-commit hook** *and* mirrored in **CI**.

**Prerequisite:** the Copilot SDK needs a GitHub Copilot subscription + auth (GitHub OAuth
or BYOK env); it manages the bundled Copilot CLI process. First run may prompt for auth.

## Verified SDK API (github/copilot-sdk @ main)

```ts
import { CopilotClient, defineTool, approveAll } from "@github/copilot-sdk";
import { z } from "zod";

const client = new CopilotClient();
const models = await client.listModels();                  // ModelInfo[] — drives the /model picker
const session = await client.createSession({
  model: "gpt-5",
  streaming: true,
  systemMessage: { mode: "replace", content: MINIMAL_SYSTEM_PROMPT }, // Pi-style minimal prompt
  tools: [loadSkillTool, rememberTool, recallTool, ...extensionTools],
  onPermissionRequest: composedPermissionHandler,          // request.kind: shell|write|read|mcp|custom-tool|...
});

session.on("assistant.message_delta", (e) => render(e.data.deltaContent));
session.on("assistant.reasoning",    (e) => renderDim(e.data.content));
session.on("tool.execution_start",   (e) => renderToolNotice(e.data.toolName));
session.on("session.idle",           () => endTurn());
await session.sendAndWait({ prompt });
await client.stop();
```

- `defineTool(name, { description, parameters: z.object, handler })`; flags
  `overridesBuiltInTool`, `skipPermission`.
- `systemMessage` modes: `append` | `customize` (per-section) | `replace`. We use
  **replace** to ship Pi's minimal prompt; built-in tools still work.
- "Minimal tools" = rely on the SDK's built-in Read/Write/Edit/Bash; we only add
  load_skill, remember, recall, and extension tools — and optionally gate via permissions.

## Architecture

```
giopilot/
├── package.json            # type:module; bin: giopilot -> dist/cli.js; engines node>=20
├── tsconfig.json           # strict
├── vitest.config.ts        # v8 coverage, thresholds: lines/branches/functions/statements ≥ 80
├── eslint.config.js        # complexity:["error",5], typescript-eslint, unicorn
├── .husky/pre-commit       # lint-staged + vitest run --coverage + complexity gate
├── .github/workflows/
│   ├── ci.yml              # on PR/push: install, lint, test --coverage (≥80), complexity check
│   └── release.yml         # on tag v*: build, version, npm publish, create GitHub Release
├── src/
│   ├── cli.ts              # #! entry: argv (run | update | --model | one-shot), boot Ink app
│   ├── version.ts          # reads package.json version; checkForUpdate() vs npm registry + GH Releases
│   ├── config.ts           # resolve+merge ~/.giopilot (global) and ./.giopilot (project) settings.json
│   ├── systemPrompt.ts     # MINIMAL_SYSTEM_PROMPT (<1000 tokens) + skill manifest + extension fragments
│   ├── harness.ts          # createHarness(): CopilotClient, listModels, build tools/perms/prompt, session
│   ├── permissions.ts      # compose onPermissionRequest from settings + extension gates
│   ├── models.ts           # list/select model; persist choice to settings
│   ├── skills/
│   │   ├── loader.ts       # discover */SKILL.md, parse frontmatter -> SkillMeta{name,description,path}
│   │   └── inject.ts       # one-line manifest string + load_skill tool (reads full body on demand)
│   ├── memory/
│   │   ├── store.ts        # read/write memory/*.md (frontmatter: name,description,type), MEMORY.md index
│   │   └── tools.ts        # remember(content,meta) & recall(query) tools; index injected each session
│   ├── extensions/
│   │   ├── api.ts          # HarnessAPI given to each extension
│   │   └── loader.ts       # discover + dynamic-import extension modules, invoke default export
│   └── ui/
│       ├── App.tsx         # Ink app: header(model+status), streaming transcript, input box
│       ├── transcript.tsx  # renders deltas, reasoning (dim), tool notices
│       ├── ModelPicker.tsx # SelectInput over listModels(); /model command
│       └── commands.ts     # slash-command registry: /model /skills /skill:name /memory /update /help /exit
├── test/                   # vitest unit + integration; SDK client mocked at boundary
└── .giopilot/              # sample config (also documents the layout)
    ├── settings.json       # { model, permissions, disabledSkills, ... }
    ├── skills/git-commit/SKILL.md
    └── extensions/hello.ts
```

Config search mirrors Pi: global `~/.giopilot/` then project `./.giopilot/` (project wins).
Memory lives under `~/.giopilot/memory/` (global) and/or `./.giopilot/memory/` (project).

## Extension API (Pi-style, in-process)

```ts
export default function (gio: HarnessAPI) {
  gio.registerTool(defineTool("deploy", { /* ... */ }));
  gio.registerCommand("ping", (args, ctx) => ctx.print("pong"));   // /ping in the TUI
  gio.addSystemPrompt("Prefer conventional commits.");
  gio.on("tool_call", (e) => {/* ... */});                         // turn_start|turn_end|user_prompt|tool_call
  gio.gatePermission((req) => req.kind === "shell" ? { kind: "reject" } : undefined);
}
```
Loaded from `~/.giopilot/extensions/` and `./.giopilot/extensions/` (`.ts` via bundled
tsx/esbuild loader). First non-undefined `gatePermission` wins; the rest compose.

## Implementation (TDD — each step: write failing test(s) first, then code)

1. **Scaffold + tooling.** package.json (ESM, `bin`), tsconfig strict, Vitest (v8 coverage,
   ≥80 thresholds), ESLint with `complexity: ["error", 5]`, Prettier, Husky + lint-staged.
   Deps: `@github/copilot-sdk`, `zod`, `ink`, `react`, `ink-select-input`, `ink-text-input`,
   `yaml`, `semver`. First red test: `version.ts` returns package version.
2. **config.ts** — `loadConfig(cwd)` locates+merges global/project `.giopilot`, parses
   settings.json (model, permission policy, disabledSkills). Tests cover precedence + defaults.
3. **systemPrompt.ts** — `MINIMAL_SYSTEM_PROMPT` (<1000 tokens; assert token budget in a
   test) + `assemble(skillManifest, extFragments, memoryIndex)`. Tests on assembly + budget.
4. **skills/loader.ts + inject.ts** — discover `skills/*/SKILL.md`, parse frontmatter
   (`name` defaults to dir, `description`); `buildManifest()` (one line/skill); `loadSkillTool`
   returns full body for a name. Tests: discovery, frontmatter defaults, manifest, lazy load.
5. **memory/store.ts + tools.ts** — `write(entry)` creates `memory/<slug>.md` (frontmatter
   name/description/type) and updates `MEMORY.md` index line; `readIndex()`, `read(name)`,
   `search(query)`. `rememberTool`/`recallTool` wrap these. Tests: create, dedupe/update,
   index integrity, search.
6. **permissions.ts** — `composePermissions(settings, gates[])`: extension gates first, then
   settings policy (auto-approve read; prompt/allow/deny shell+write per settings; trusted
   mode = approveAll). Tests for each branch.
7. **extensions/api.ts + loader.ts** — define `HarnessAPI`; loader discovers + imports
   modules, calls `default(api)` (await async), collects tools/commands/fragments/gates/
   listeners. Tests with fixture extensions.
8. **models.ts** — `listModels()` (wrap SDK), `selectModel`/persist to settings. SDK mocked.
9. **version.ts** — `checkForUpdate(current)`: query npm registry `dist-tags.latest` (fallback
   GitHub Releases API), `semver.gt` → return update info. Tests mock fetch.
10. **harness.ts** — `createHarness(config)`: `new CopilotClient()`, gather skills+memory+
    extensions, build tools `[loadSkill, remember, recall, ...ext]`, build systemMessage,
    compose permissions, `createSession`, expose `{ session, sendTurn, commands, models,
    setModel, stop }`. Integration test against a mocked CopilotClient.
11. **ui/** (Ink) — `App.tsx` (header with model+status, scrolling transcript, input box),
    `transcript` (deltas + dim reasoning + tool notices), `ModelPicker`. `commands.ts`
    registry: `/model`, `/models`, `/skills`, `/skill:name`, `/memory`, `/update`, `/help`,
    `/exit`, plus extension commands. Test render logic with `ink-testing-library`; keep UI
    components thin (logic lives in tested modules) to hit coverage + complexity gates.
12. **cli.ts** — `#!/usr/bin/env node`; subcommands: default→TUI, `giopilot "task"`→one-shot
    turn then exit, `giopilot update`→check + instruct/perform `npm i -g`, `--model` flag.
13. **CI/release** — `ci.yml` (lint + `vitest run --coverage` failing under 80 + complexity);
    `release.yml` on `v*` tag → build, set version, `npm publish --provenance`, create GitHub
    Release. `.husky/pre-commit` runs lint-staged + coverage + complexity locally.
14. **Samples + README** — sample skill + extension; README covers prereqs (Copilot auth),
    `npm i -g giopilot`, config/memory layout, writing skills/extensions, updating.

## Quality gates (enforced pre-commit AND in CI)

- **Lint:** ESLint (typescript-eslint) clean.
- **Coverage:** Vitest v8, thresholds ≥80% (lines/branches/functions/statements); core logic
  targeted at ~100% via TDD. Build fails otherwise.
- **Complexity:** ESLint `complexity: ["error", 5]` — any function with cyclomatic
  complexity ≥5 fails. Keep functions small; push branching into data/strategy maps.

## Verification

- `npm i && npm test` → all green, coverage ≥80%, no lint/complexity errors.
- `npm run build && npm link` → `giopilot` on PATH.
- `giopilot` → Ink TUI boots (auth if needed), header shows current model.
- `/model` → picker lists `client.listModels()`, switching persists to settings.
- Normal prompt → streamed answer; built-in tools edit files on disk (e.g. "create foo.txt").
- `/skills` shows the one-line manifest; `/skill:git-commit` (or model calling `load_skill`)
  loads the full body — confirm via the tool notice and small context.
- Memory: ask it to "remember X" → a `memory/<slug>.md` + `MEMORY.md` index line appear;
  new session recalls via the injected index / `recall`.
- Sample extension: `/ping` works; model uses the extension's tool; its prompt fragment loads.
- `giopilot "list files in cwd"` → one-shot turn then exits.
- `giopilot update` → reports current vs latest from the registry.
- Push a `vX.Y.Z` tag → release.yml publishes to npm + creates a GitHub Release.

## Out of scope (later)

- True Pi own-the-loop ReAct (blocked by managed-only SDK access).
- MCP wiring (SDK supports it; add via an extension), themes/status-line polish, packages,
  session persistence, vector memory.
