# 0007 — Copilot credits via the `copilot_internal` endpoint

**Status:** Accepted

## Context

We wanted to show GitHub Copilot **Credits** in the status line, like the VS Code Copilot
extension's hover (`3,189.2 / 6,800 used`). The Copilot SDK exposes no quota/credits API
(`getStatus()` returns version only; `getAuthStatus()` returns identity).

## Decision

Match the official VS Code extension (`microsoft/vscode-copilot-chat`): read
`https://api.github.com/copilot_internal/user`, take `quota_snapshots.premium_interactions`
(the "Credits"; fall back to `chat` when not entitled), and compute
`used = entitlement × (1 − percent_remaining/100)`, displayed as `used / total used`.
Authenticate with `GITHUB_TOKEN` / `GH_TOKEN`, else `gh auth token`.

## Consequences

- ✅ The figure matches what VS Code shows, from the same source and formula.
- ✅ Best-effort and isolated: any failure omits the segment; the fetch is unit-tested with an
  injected `FetchLike`.
- ❌ The endpoint is **undocumented** and may change without notice.
- ➡️ Credits reflect the authenticated account; set `GITHUB_TOKEN` to view another (e.g. a
  Copilot Enterprise org).
