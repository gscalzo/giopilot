# Development

[← Back to README](../README.md)

## Scripts

```bash
npm test               # Vitest suite
npm run test:coverage  # with coverage (≥80% enforced)
npm run lint           # ESLint (incl. cyclomatic complexity ≤ 5)
npm run typecheck      # tsc --noEmit
npm run check          # lint + typecheck + coverage  ← the full gate
npm run build          # compile to dist/ (and chmod the bin)
npm run dev -- "task"  # run from source via tsx
```

## Test-first

Every unit is written test-first with **Vitest**. Core logic lives in small, single-purpose
modules with hand-written test doubles against narrow interfaces (`ClientLike`, `SessionLike`,
`FetchLike`, `ReplIO`) — no heavy auto-mocks. UI logic lives in the framework-free
`SessionController`, so the Ink view stays thin and the logic stays unit-testable.

## Quality gates

The same gate runs locally (Husky `pre-commit` → `npm run check`) and in CI
(`.github/workflows/ci.yml`):

- **ESLint** clean (typescript-eslint).
- **Cyclomatic complexity ≤ 5** per function (`complexity: ["error", 5]`). This is strict by
  design — it forces small functions and data-driven dispatch instead of deep branching.
- **Coverage ≥ 80%** (the project sits near 100%).

## Releases

Tagging `vX.Y.Z` triggers `.github/workflows/release.yml`:

1. run the full gate,
2. set the version from the tag,
3. `npm publish --provenance`,
4. create a GitHub Release.

Requires an `NPM_TOKEN` repo secret. See [Notes](./notes.md#releases) for prerequisites.

## Project layout

```
src/
├── cli.ts            # entry: flags, one-shot vs TUI, token + status-line wiring
├── config.ts         # resolve + merge settings (global + project)
├── systemPrompt.ts   # minimal prompt + section assembly
├── frontmatter.ts    # shared YAML frontmatter parse/stringify
├── manifest.ts       # one-line "- name: description" rendering
├── harness.ts        # builds the Copilot session, tools, prompt, events
├── permissions.ts    # composePermissions(policy, gates)
├── version.ts        # self-update check
├── git.ts            # current branch
├── credits.ts        # Copilot quota fetch + format
├── statusline.ts     # status-line formatting
├── models.ts         # model flag parsing + picker choices
├── complete.ts       # command autocomplete
├── repl.ts           # slash-command dispatch (BUILTINS table)
├── skills/           # loader + inject (lazy load_skill)
├── extensions/       # api + loader
├── memory/           # store + remember/recall tools
└── ui/               # controller (logic) + App.tsx (Ink view)
```

See [Architecture](./architecture.md) for how these fit together.
