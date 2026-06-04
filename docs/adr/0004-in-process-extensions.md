# 0004 — In-process TypeScript extensions

**Status:** Accepted

## Context

The Copilot SDK has its own out-of-process extension mechanism (`extension.mjs` forked as a
child process over JSON-RPC). Pi's model is simpler: in-process TypeScript modules that
register capabilities against a small API. We wanted Pi's ergonomics and a surface we own.

## Decision

Define a minimal `HarnessAPI` (`registerTool`, `registerCommand`, `addSystemPrompt`,
`gatePermission`, `settings`). Discover modules from `~/.giopilot/extensions/` and
`./.giopilot/extensions/`, dynamic-import each, and call its default export (await if async).
Failures are captured per-module and reported, never thrown.

## Consequences

- ✅ Extensions are tiny, synchronous to author, and run in-process.
- ✅ One bad extension can't take down the harness.
- ❌ No process isolation; an extension runs with the harness's privileges.
- ➡️ MCP is intentionally out of core — add it via an extension when needed.
