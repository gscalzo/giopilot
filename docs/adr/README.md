# Architecture Decision Records

[← Back to README](../../README.md)

Short records of the decisions that shaped giopilot, in the
[lightweight ADR](https://adr.github.io/) style: **Context → Decision → Consequences**.

| # | Decision | Status |
|---|---|---|
| [0001](./0001-wrap-copilot-managed-loop.md) | Wrap the Copilot SDK's managed loop (don't reimplement ReAct) | Accepted |
| [0002](./0002-typescript-ink-tui.md) | TypeScript + Ink, with a framework-free controller | Accepted |
| [0003](./0003-lazy-skills.md) | Lazy skills: one-line manifest + `load_skill` | Accepted |
| [0004](./0004-in-process-extensions.md) | In-process TypeScript extensions | Accepted |
| [0005](./0005-permission-gating.md) | Composed permission policy + extension gates | Accepted |
| [0006](./0006-complexity-gate.md) | Enforce cyclomatic complexity ≤ 5 | Accepted |
| [0007](./0007-credits-endpoint.md) | Copilot credits via the `copilot_internal` endpoint | Accepted |
| [0008](./0008-shell-passthrough-not-in-context.md) | `!` shell pass-through is display-only, not in the agent's context | Accepted |
