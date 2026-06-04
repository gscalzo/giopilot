# 0001 — Wrap the Copilot SDK's managed loop

**Status:** Accepted

## Context

Pi's appeal is that *you* own a tiny ReAct loop. The GitHub Copilot SDK, however, exposes a
**managed** agent session only: it owns planning, tool invocation, and file edits internally,
and does not expose raw token-level completions. We wanted Pi's ergonomics powered by the
Copilot SDK.

## Decision

Do **not** reimplement a ReAct loop. Wrap the SDK's managed session and make it *feel* like
Pi by controlling the four things around it: the system prompt (`mode: "replace"`), the tool
set, the permission handler, and the streaming events. The harness depends on the SDK through
narrow `ClientLike` / `SessionLike` interfaces.

## Consequences

- ✅ Full use of the SDK's planning, built-in tools, and model routing for free.
- ✅ Testable: the harness is unit-tested against hand-written client/session doubles.
- ❌ We cannot do a literal token-level loop or own-the-loop behaviours.
- ➡️ Model switching re-opens the session (it can't be changed in place).
