# Extensions

[← Back to README](../README.md)

An **extension** is a TypeScript (or `.mjs`/`.js`) module with a default export that
receives the `HarnessAPI`. Extensions are giopilot's in-process customization surface
(Pi-style) — they run in the same process, not as MCP servers.

## The `HarnessAPI`

```ts
import { defineTool } from "@github/copilot-sdk";
import type { HarnessAPI } from "giopilot";

export default function (gio: HarnessAPI) {
  // 1. a slash command: /ping
  gio.registerCommand("ping", (args, ctx) => ctx.print(args ? `pong: ${args}` : "pong"));

  // 2. an LLM-callable tool
  gio.registerTool(
    defineTool("now", {
      description: "Return the current time.",
      parameters: { type: "object", properties: {} },
      handler: () => ({ now: new Date().toISOString() }),
    }),
  );

  // 3. append to the system prompt
  gio.addSystemPrompt("When the user asks for the time, call the `now` tool.");

  // 4. gate permissions (return a decision, or undefined to abstain)
  gio.gatePermission((req) =>
    req.kind === "url" ? { kind: "reject", feedback: "no network" } : undefined,
  );
}
```

| Method | Purpose |
|---|---|
| `registerTool(tool)` | Add an LLM-callable tool (`defineTool` from the SDK). |
| `registerCommand(name, handler)` | Add a `/name` slash command for the TUI. |
| `addSystemPrompt(fragment)` | Append a fragment to the system prompt. |
| `gatePermission(gate)` | Add a permission gate (runs before the settings policy). |
| `settings` | Read-only view of the resolved settings. |

The default export may be `async` (it is awaited before startup).

## Loading

Extensions are discovered from `~/.giopilot/extensions/` and `./.giopilot/extensions/`. Each
module's default export is called with the `HarnessAPI`. A failing extension is **reported,
never fatal** — one bad module can't take down the harness. See
[ADR&nbsp;0004](./adr/0004-in-process-extensions.md).
