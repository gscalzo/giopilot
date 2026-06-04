import { CopilotClient } from "@github/copilot-sdk";
import type { Tool, PermissionHandler } from "@github/copilot-sdk";
import type { ResolvedConfig } from "./config.js";
import { composePermissions } from "./permissions.js";
import { assembleSystemPrompt } from "./systemPrompt.js";
import { discoverSkills, readSkillBody, type SkillMeta } from "./skills/loader.js";
import { buildManifest, createLoadSkillTool } from "./skills/inject.js";
import { createExtensionRegistry, type ExtensionCommand } from "./extensions/api.js";
import { loadExtensions, type ExtensionLoadResult } from "./extensions/loader.js";
import { listMemories } from "./memory/store.js";
import { createRememberTool, createRecallTool } from "./memory/tools.js";
import { manifestLines } from "./manifest.js";

/** A model as surfaced to the picker. */
export interface ModelInfoLike {
  id: string;
  name?: string;
}

/** Minimal session surface the harness depends on (subset of the SDK's Session). */
export interface SessionLike {
  on(eventType: string, handler: (event: unknown) => void): () => void;
  sendAndWait(prompt: string, timeout?: number): Promise<unknown>;
}

/** Minimal client surface the harness depends on (subset of CopilotClient). */
export interface ClientLike {
  start?(): Promise<void>;
  createSession(config: Record<string, unknown>): Promise<SessionLike>;
  listModels?(): Promise<ModelInfoLike[]>;
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
  /** Current model id. Changes after setModel. */
  readonly model: string;
  skills: SkillMeta[];
  commands: Map<string, ExtensionCommand>;
  extensionResults: ExtensionLoadResult[];
  systemPrompt: string;
  sendTurn(prompt: string): Promise<void>;
  loadSkillBody(name: string): string | null;
  listModels(): Promise<ModelInfoLike[]>;
  setModel(model: string): Promise<void>;
  stop(): Promise<void>;
}

/** Read a string field from a session event's `data` payload. */
function field(event: unknown, key: string): string | undefined {
  const value = (event as { data?: Record<string, unknown> }).data?.[key];
  return typeof value === "string" ? value : undefined;
}

function wireEvents(session: SessionLike, render: RenderHooks): void {
  session.on("assistant.message_delta", (event) => {
    const text = field(event, "deltaContent");
    if (text !== undefined) render.onDelta?.(text);
  });
  session.on("tool.execution_start", (event) => {
    const name = field(event, "toolName");
    if (name !== undefined) render.onToolStart?.(name);
  });
  session.on("session.idle", () => render.onIdle?.());
}

const defaultClientFactory: ClientFactory = () =>
  // Silence the bundled CLI subprocess's Node warnings (e.g. the experimental
  // node:sqlite notice) so startup output stays clean.
  new CopilotClient({
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  }) as unknown as ClientLike;

/**
 * Build a giopilot harness: discover skills + extensions, assemble the minimal
 * system prompt, create a Copilot session wrapping its managed loop, and wire
 * streaming events to the supplied render hooks. The session can be rebuilt with
 * a different model via setModel.
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

  const memoryManifest = manifestLines(listMemories(config.memoryDir));

  const systemPrompt = assembleSystemPrompt({
    skillManifest: buildManifest(skills),
    memoryManifest,
    extensionFragments: registry.fragments,
  });

  const tools: Tool<unknown>[] = [
    createLoadSkillTool(skills) as Tool<unknown>,
    createRememberTool(config.memoryDir) as Tool<unknown>,
    createRecallTool(config.memoryDir) as Tool<unknown>,
    ...registry.tools,
  ];

  let model = config.settings.model;
  const onPermissionRequest = composePermissions(
    config.settings.permissions ?? {},
    registry.gates,
  ) as unknown as PermissionHandler;

  async function openSession(): Promise<SessionLike> {
    const session = await client.createSession({
      model,
      streaming: true,
      systemMessage: { mode: "replace", content: systemPrompt },
      tools,
      onPermissionRequest,
    });
    wireEvents(session, render);
    return session;
  }

  let session = await openSession();

  return {
    get model() {
      return model;
    },
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
    listModels: async () => (client.listModels ? client.listModels() : []),
    setModel: async (next) => {
      model = next;
      session = await openSession();
    },
    stop: async () => {
      await client.stop();
    },
  };
}
