# 0002 — TypeScript + Ink, with a framework-free controller

**Status:** Accepted

## Context

We wanted a rich terminal UI (streaming transcript, model picker, autocomplete, status line)
without coupling the application logic to a UI framework, and without sacrificing the
test-first discipline or the complexity budget.

## Decision

Build the UI on **Ink** (React for the terminal), but put **all interactive logic** in a
plain-TypeScript `SessionController` (transcript state, status, submit, model switching,
autocomplete inputs). `App.tsx` is a thin subscriber that renders controller state and
forwards input. TypeScript throughout matches Pi's extension ergonomics and the SDK's
first-class TS package.

## Consequences

- ✅ The logic is fully unit-tested without a terminal; the Ink view is excluded from the
  coverage gate because it carries no logic.
- ✅ Adding UI surfaces (e.g. the status line) is a controller change plus a thin render.
- ❌ Two render paths historically existed (readline + Ink); the readline loop was deleted
  once the TUI shipped to remove the duplication.
