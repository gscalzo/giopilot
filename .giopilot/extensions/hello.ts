import { defineTool } from "@github/copilot-sdk";
import type { HarnessAPI } from "../../src/extensions/api.js";

/**
 * Sample extension. Demonstrates the three extension surfaces:
 *  - a slash command (/ping)
 *  - an LLM-callable tool (now)
 *  - a system-prompt fragment
 */
export default function (gio: HarnessAPI): void {
  gio.registerCommand("ping", (args, ctx) => {
    ctx.print(args ? `pong: ${args}` : "pong");
  });

  gio.registerTool(
    defineTool("now", {
      description: "Return the current date and time as an ISO 8601 string.",
      parameters: { type: "object", properties: {} },
      handler: () => ({ now: new Date().toISOString() }),
    }),
  );

  gio.addSystemPrompt("When the user asks for the time, call the `now` tool.");
}
