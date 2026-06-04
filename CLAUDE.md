# giopilot — guide for Claude

Tiny, Pi-style coding-agent harness wrapping the GitHub Copilot SDK. TypeScript · Vitest · Ink TUI.

## Always

- **TDD**: write the failing test first.
- Run `npm run check` (lint + typecheck + coverage) before committing — it's the pre-commit gate.
- Keep cyclomatic complexity ≤ 5 (ESLint-enforced): extract helpers / use dispatch tables, don't raise the rule.
- **Maintain `./docs`**: when you change behaviour, update the matching doc; record non-trivial decisions as an ADR in `docs/adr/`.
- Keep **this file tiny** — put detail in `./docs` and link it, so it loads only when needed.

## Where things are (read on demand)

- Architecture & data flow → [docs/architecture.md](./docs/architecture.md)
- Why decisions were made → [docs/adr/](./docs/adr/)
- Usage · config · skills · extensions · memory → [docs/](./docs/)
- Dev workflow, quality gates, releases → [docs/development.md](./docs/development.md)
- Caveats & known limits → [docs/notes.md](./docs/notes.md)

Source layout is documented in [docs/development.md](./docs/development.md#project-layout).
