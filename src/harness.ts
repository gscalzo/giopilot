import { CopilotClient, approveAll } from "@github/copilot-sdk";
import type { Tool } from "@github/copilot-sdk";
import type { ResolvedConfig } from "./config.js";
import { assembleSystemPrompt } from "./systemPrompt.js";
import { discoverSkills, readSkillBody, type SkillMeta } from "./skills/loader.js";
import { buildManifest, createLoadSkillTool } from "./skills/inject.js";
import { createExtensionRegistry, type ExtensionCommand } from "./extensions/api.js";
import { loadExtensions, type ExtensionLoadResult } from "./extensions/loader.js";

/** Minimal session surface the harness depends on (subset of the SDK's Session). */
export interface SessionLike {
  on(eventType: string, handler: (event: unknown) => void): () => void;
  sendAndWait(prompt: string, timeout?: number): Promise<unknown>;
}

/** Minimal client surface the harness depends on (subset of CopilotClient). */
export interface ClientLike {
  createSession(config: Record<string, unknown>): Promise<SessionLike>;
  stop(): Promise<void> | void;
}

export type ClientFactory = () => ClientLike;

/** Hooks the REPL/TUI supplies to render streaming output. */
export interface RenderHooks {
  onDelta?(text: string): void;
  onToolStart?(toolName: string): void;
  onIdle?(): void;
}

export interface CreateHarnessOptions {
  clientFactory?: ClientFactory;
  render?: RenderHooks;
}

export interface Harness {
  skills: SkillMeta[];
  commands: Map<string, ExtensionCommand>;
  extensionResults: ExtensionLoadResult[];
  systemPrompt: string;
  sendTurn(prompt: string): Promise<void>;
  loadSkillBody(name: string): string | null;
  stop(): Promise<void>;
}

function wireEvents(session: SessionLike, render: RenderHooks): void {
  session.on("assistant.message_delta", (event) => {
    const text = (event as { data?: { deltaContent?: string } }).data?.deltaContent;
    if (typeof text === "string") render.onDelta?.(text);
  });
  session.on("tool.execution_start", (event) => {
    const name = (event as { data?: { toolName?: string } }).data?.toolName;
    if (typeof name === "string") render.onToolStart?.(name);
  });
  session.on("session.idle", () => render.onIdle?.());
}

const defaultClientFactory: ClientFactory = () => new CopilotClient() as unknown as ClientLike;

/**
 * Build a giopilot harness: discover skills + extensions, assemble the minimal
 * system prompt, create a Copilot session wrapping its managed loop, and wire
 * streaming events to the supplied render hooks.
 */
export async function createHarness(
  config: ResolvedConfig,
  options: CreateHarnessOptions = {},
): Promise<Harness> {
  const render = options.render ?? {};
  const client = (options.clientFactory ?? defaultClientFactory)();

  const skills = discoverSkills(config.skillDirs);
  const skillsByName = new Map(skills.map((s) => [s.name, s]));

  const registry = createExtensionRegistry(config.settings);
  const extensionResults = await loadExtensions(config.extensionDirs, registry.api);

  const systemPrompt = assembleSystemPrompt({
    skillManifest: buildManifest(skills),
    extensionFragments: registry.fragments,
  });

  const tools: Tool<unknown>[] = [
    createLoadSkillTool(skills) as Tool<unknown>,
    ...registry.tools,
  ];

  const session = await client.createSession({
    model: config.settings.model,
    streaming: true,
    systemMessage: { mode: "replace", content: systemPrompt },
    tools,
    onPermissionRequest: approveAll,
  });

  wireEvents(session, render);

  return {
    skills,
    commands: registry.commands,
    extensionResults,
    systemPrompt,
    sendTurn: async (prompt) => {
      await session.sendAndWait(prompt);
    },
    loadSkillBody: (name) => {
      const skill = skillsByName.get(name);
      return skill ? readSkillBody(skill) : null;
    },
    stop: async () => {
      await client.stop();
    },
  };
}
