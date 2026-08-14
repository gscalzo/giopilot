# 0008 — `!` shell pass-through is display-only, not in the agent's context

**Status:** Accepted

## Context

Users often want to run a quick shell command (`git status`, `ls`, `npm test`) mid-session
without dropping out of giopilot. A leading `!` is the familiar REPL convention for this.

The open question was where the command and its output go. Two options:

1. **Feed it to the model** — append the command + output to the conversation, like a tool
   result, so the agent can reason about it.
2. **Display-only** — run it, show the output to the user, and keep it out of the agent's
   context entirely.

## Decision

`!`-prefixed lines run in a subshell (`child_process.exec`) and the combined stdout/stderr
(plus a `[exit N]` note on non-zero exit) is printed to the transcript **for the user only**.
The harness's `sendTurn` is never called, so neither the command nor its output enters the
Copilot session — it is not part of the conversation the model sees ("not added to memory").

`SessionController.submit` intercepts `!` before the slash-command / prompt dispatch and
routes to a private `runShellCommand`; the shell helper lives in `src/shell.ts`. In the TUI,
shell mode is signalled by a yellow `!` glyph and yellow field; the leading `!` is rendered
as the glyph rather than inside the field, and erasing the command exits shell mode.

## Consequences

- ✅ A fast escape hatch for shell work without polluting the agent's context window or its
  reasoning with incidental command output.
- ✅ Clear, isolated, easy to test: `runShell` is a pure-ish promise over `exec`, unit-tested
  for stdout, stderr, silent success, and exit codes.
- ❌ The agent can't act on `!` output — to share something with the model, paste it (or
  describe it) as a normal prompt.
- ❌ Commands run in a real subshell with the user's environment and privileges; there is no
  sandboxing or permission gate (unlike SDK tool calls). It is a deliberate, user-typed
  action.
