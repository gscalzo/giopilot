import type { Tool } from "@github/copilot-sdk";
import type { Settings } from "../config.js";
import type { PermissionGate } from "../permissions.js";

/** Context handed to an extension command when it runs from the REPL. */
export interface CommandRunContext {
  /** Raw argument string after the command name. */
  args: string;
  /** Print a line of output to the user. */
  print: (text: string) => void;
}

export type ExtensionCommandHandler = (
  args: string,
  ctx: CommandRunContext,
) => void | Promise<void>;

export interface ExtensionCommand {
  name: string;
  handler: ExtensionCommandHandler;
}

/**
 * The object passed to each extension's default export. Keep it small and stable —
 * this is giopilot's public extension surface (Pi-style, in-process).
 */
export interface HarnessAPI {
  /** Read-only view of the resolved settings. */
  readonly settings: Settings;
  /** Register an LLM-callable tool (use defineTool from @github/copilot-sdk). */
  registerTool(tool: Tool<unknown>): void;
  /** Register a slash-command available as /name in the REPL. */
  registerCommand(name: string, handler: ExtensionCommandHandler): void;
  /** Append a fragment to the system prompt. */
  addSystemPrompt(fragment: string): void;
  /** Add a permission gate; return a decision to handle a request, or undefined to abstain. */
  gatePermission(gate: PermissionGate): void;
}

/** Everything extensions contributed, collected for the harness to consume. */
export interface ExtensionRegistry {
  api: HarnessAPI;
  tools: Tool<unknown>[];
  commands: Map<string, ExtensionCommand>;
  fragments: string[];
  gates: PermissionGate[];
}

export function createExtensionRegistry(settings: Settings): ExtensionRegistry {
  const tools: Tool<unknown>[] = [];
  const commands = new Map<string, ExtensionCommand>();
  const fragments: string[] = [];
  const gates: PermissionGate[] = [];

  const api: HarnessAPI = {
    settings,
    registerTool(tool) {
      tools.push(tool);
    },
    registerCommand(name, handler) {
      commands.set(name, { name, handler });
    },
    addSystemPrompt(fragment) {
      fragments.push(fragment);
    },
    gatePermission(gate) {
      gates.push(gate);
    },
  };

  return { api, tools, commands, fragments, gates };
}
