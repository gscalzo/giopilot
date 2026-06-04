# 0006 — Enforce cyclomatic complexity ≤ 5

**Status:** Accepted

## Context

A linter can't see duplication, but it *can* keep functions small. We wanted a mechanical
guardrail that pushes the codebase toward Kent Beck's "small, intention-revealing functions"
rather than relying on review discipline.

## Decision

Enable ESLint's `complexity: ["error", 5]` across `src/`, enforced in the `npm run check`
gate (Husky pre-commit **and** CI). When a function exceeds it, extract helpers or replace
branching with data-driven dispatch (e.g. the `BUILTINS` command table, the source list in
`checkForUpdate`) rather than raising the threshold.

## Consequences

- ✅ No deep nesting or long methods anywhere; functions stay readable.
- ✅ Refactors are forced early, while they're cheap.
- ❌ Naturally branchy code (CLI flag handling, UI dispatch) needs deliberate decomposition;
  a rare scoped `eslint-disable` is preferred over silently relaxing the rule.
