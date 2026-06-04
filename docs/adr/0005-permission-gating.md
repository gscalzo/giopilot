# 0005 — Composed permission policy + extension gates

**Status:** Accepted

## Context

The SDK requires an `onPermissionRequest` handler; the simplest is `approveAll`, which we
shipped initially. But a coding agent that can run shell commands and write files should be
governable, and extensions may need fine-grained control (e.g. block network).

## Decision

Replace `approveAll` with `composePermissions(policy, gates)`:

1. run extension **gates** in order — the first to return a decision wins;
2. otherwise apply the per-kind **settings policy** (`"deny"` → reject, else approve).

Kinds mirror the SDK: `shell`, `write`, `read`, `url`, `mcp`, `custom-tool`, `memory`,
`hook`. With no policy and no gates, behaviour is unchanged (approve everything).

## Consequences

- ✅ Safe-by-config without forcing interactive prompts.
- ✅ Extensions compose cleanly with user policy; the function is pure and unit-tested.
- ❌ No interactive "ask the user" decision yet — policy is declarative only.
