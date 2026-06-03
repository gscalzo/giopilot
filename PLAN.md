# giopilot — a simplistic, Pi-style coding agent on the GitHub Copilot SDK

## Context

Build the smallest thing that captures **Pi's essence** — a minimal system prompt, a tiny
core, lazily-injected skills, and a TS extension mechanism — but powered by the **GitHub
Copilot SDK** (`@github/copilot-sdk`) instead of a hand-rolled model loop.

Critical constraint (verified): the Copilot SDK exposes a **managed** agent session only.
It owns the plan→tool→edit loop and ships built-in Read/Write/Edit/Bash tools; there are no
raw token streams. So giopilot **wraps** that loop — we don't reimplement Pi's ReAct loop;
we make Copilot *feel* like Pi by controlling the system prompt, the tool set, the skills,
and the extension surface around it.

**Refinement goal:** keep the MVP genuinely simplistic. Ship Pi's core first (Phase 1).
Everything heavier I asked for earlier (rich TUI, model picker, memory, self-update, release
automation, strict quality gates) is preserved but **deferred to later phases**, so the core
stays small and the project is runnable end-to-end as early as possible.

**Prerequisite:** a GitHub Copilot subscription + auth (GitHub OAuth or BYOK env). The SDK
manages the bundled Copilot CLI process; first run may prompt for auth.

## Verified SDK API (github/copilot-sdk @ main)

```ts
import { CopilotClient, defineTool, approveAll } from "@github/copilot-sdk";
import { z } from "zod";

const client = new CopilotClient();
const session = await client.createSession({
  model: "gpt-5",
  streaming: true,
  systemMessage: { mode: "replace", content: MINIMAL_SYSTEM_PROMPT }, // Pi-style <1000-token prompt
  tools: [loadSkillTool, ...extensionTools],                           // built-in Read/Write/Edit/Bash stay on
  onPermissionRequest: approveAll,                                     // simplistic default; gate later
});

session.on("assistant.message_delta", (e) => process.stdout.write(e.data.deltaContent));
session.on("tool.execution_start",   (e) => printToolNotice(e.data.toolName));
session.on("session.idle",           () => endTurn());
await session.sendAndWait({ prompt });
await client.stop();
```

- `defineTool(name, { description, parameters: z.object, handler })`.
- `systemMessage` modes: `append` | `customize` | `replace`. We use **replace** for the
  minimal Pi prompt; built-in tools still function.
- "Minimal core" = lean on built-in Read/Write/Edit/Bash; the only custom tool in the MVP is
  `load_skill`. Everything else arrives through extensions.

---

## Phase 1 — Simplistic Pi MVP (the deliverable)

A runnable CLI that wraps a Copilot session with a minimal prompt, lazy skills, and an
extension loader. Plain-readline REPL (no TUI framework yet).

```
giopilot/
├── package.json            # type:module; bin: giopilot -> dist/cli.js; node>=20
├── tsconfig.json           # strict
├── src/
│   ├── cli.ts              # #! entry: parse argv (REPL | one-shot "task"), boot harness
│   ├── config.ts           # find+merge ~/.giopilot (global) and ./.giopilot (project) settings.json
│   ├── systemPrompt.ts     # MINIMAL_SYSTEM_PROMPT (<1000 tokens) + skill manifest + ext fragments
│   ├── harness.ts          # createHarness(): CopilotClient, build tools/prompt, createSession, wire events
│   ├── repl.ts             # readline loop; stream deltas + tool notices; slash-commands
│   ├── skills/
│   │   ├── loader.ts       # discover skills/*/SKILL.md, parse frontmatter -> {name,description,path}
│   │   └── inject.ts       # buildManifest() one line/skill + loadSkillTool (full body on demand)
│   └── extensions/
│       ├── api.ts          # HarnessAPI given to each extension
│       └── loader.ts       # discover + import extension modules, call default(api)
└── .giopilot/              # sample config + docs of the layout
    ├── settings.json       # { model }
    ├── skills/git-commit/SKILL.md
    └── extensions/hello.ts
```

**Pi-faithful behaviors in the MVP**
- **Minimal system prompt** (`MINIMAL_SYSTEM_PROMPT`, <1000 tokens) shipped via
  `systemMessage.mode:"replace"`.
- **Lazy skills:** scan `skills/*/SKILL.md`; inject only a one-line `- name: description`
  manifest each turn; `load_skill(name)` returns the full body on demand; `/skill:name` forces it.
- **Extensions (in-process TS):**
  ```ts
  export default function (gio: HarnessAPI) {
    gio.registerTool(defineTool("deploy", { /* ... */ }));
    gio.registerCommand("ping", (args, ctx) => ctx.print("pong")); // /ping in REPL
    gio.addSystemPrompt("Prefer conventional commits.");
  }
  ```
  Loaded from `~/.giopilot/extensions/` and `./.giopilot/extensions/` (TS via tsx/esbuild loader).

**Config:** global `~/.giopilot/` then project `./.giopilot/` (project wins). `model` from
settings; default permission handler = `approveAll` (simplistic; gating comes in Phase 3).

### Phase 1 build steps (TDD with Vitest — test-first per unit)
1. Scaffold: package.json (ESM, `bin`), tsconfig strict, Vitest. Deps: `@github/copilot-sdk`,
   `zod`, `yaml`, `tsx`. First red test: config precedence.
2. `config.ts` — locate+merge global/project `.giopilot`, parse settings.json. Tests: precedence, defaults.
3. `systemPrompt.ts` — `MINIMAL_SYSTEM_PROMPT` (assert <1000-token budget) + `assemble(manifest, fragments)`.
4. `skills/loader.ts` + `inject.ts` — discovery, frontmatter defaults (name=dir), manifest, `loadSkillTool` lazy body.
5. `extensions/api.ts` + `loader.ts` — `HarnessAPI` (registerTool/registerCommand/addSystemPrompt); import fixtures.
6. `harness.ts` — CopilotClient (mocked in tests), tools=[loadSkill, ...ext], build prompt, createSession, wire events.
7. `repl.ts` — readline loop; `/skills`, `/skill:name`, `/help`, `/exit`, extension commands; stream rendering.
8. `cli.ts` — `#!/usr/bin/env node`; default→REPL, `giopilot "task"`→one-shot turn then exit.
9. Samples: `.giopilot/skills/git-commit/SKILL.md` + `.giopilot/extensions/hello.ts`. README (prereqs, install, layout).

### Phase 1 verification
- `npm i && npm test` green.
- `npm run build && npm link` → `giopilot` on PATH.
- `giopilot` → REPL boots (auth if needed); normal prompt streams; "create foo.txt" actually writes via built-in tools.
- `/skills` shows the one-line manifest; `/skill:git-commit` (or model calling `load_skill`) loads the full body (visible tool notice, small context).
- Sample extension: `/ping` works; model uses its tool; its prompt fragment is present.
- `giopilot "list files in cwd"` → one-shot then exits.

---

## Phase 2 — Ergonomics (optional, additive)
- **Ink TUI** replacing the readline REPL: header (current model + status), scrolling
  transcript (deltas + dim `assistant.reasoning` + tool notices), input box; logic stays in
  Phase-1 modules so components are thin. Test with `ink-testing-library`.
- **Model selection:** `client.listModels()` → `/model` picker; default in settings; `--model` flag.

## Phase 3 — Capabilities (optional, additive)
- **Memory:** `memory/<slug>.md` files (frontmatter name/description/type) + `MEMORY.md` index;
  `remember`/`recall` tools; index injected each session.
- **Permission gating:** replace `approveAll` with a composed handler (extension `gatePermission`
  hooks first, then settings policy: auto-approve read, prompt/allow/deny shell+write).

## Phase 4 — Distribution & quality bar (optional, additive)
- **Self-update:** `giopilot update` checks npm `dist-tags.latest` (fallback GitHub Releases) via `semver`.
- **Release CI:** `.github/workflows/release.yml` on `v*` tag → build, version, `npm publish --provenance`, GitHub Release.
- **Quality gates (pre-commit + CI):** ESLint clean, Vitest coverage ≥80%, `complexity:["error",5]`
  (cyclomatic <5). Husky pre-commit + `ci.yml` mirror. Note: complexity<5 is strict and will
  pressure the Ink/dispatch code — keep functions tiny and push branching into data/strategy
  maps; surface any scoped `eslint-disable` rather than silently raising the threshold.

---

## Out of scope
- True Pi own-the-loop ReAct (blocked by the managed-only SDK).
- MCP wiring (SDK supports it; add via an extension), themes/status-line polish, packages, session persistence, vector memory.

## Note on this file
This plan also lives in the repo as `PLAN.md` (commit `3468d05` on `gscalzo/giopilot`). After
refining here, sync it back with `cp` + commit so the repo copy matches.
