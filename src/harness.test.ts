import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "./config.js";
import { createHarness } from "./harness.js";
import type { ClientLike, SessionLike } from "./harness.js";

class FakeSession implements SessionLike {
  handlers = new Map<string, (event: unknown) => void>();
  sendAndWait = vi.fn(async () => undefined);

  on(eventType: string, handler: (event: unknown) => void): () => void {
    this.handlers.set(eventType, handler);
    return () => this.handlers.delete(eventType);
  }

  emit(eventType: string, event: unknown) {
    this.handlers.get(eventType)?.(event);
  }
}

class FakeClient implements ClientLike {
  session = new FakeSession();
  lastConfig: Record<string, unknown> | undefined;
  start = vi.fn(async () => undefined);
  createSession = vi.fn(async (config: Record<string, unknown>) => {
    this.lastConfig = config;
    return this.session;
  });
  listModels = vi.fn(async () => [
    { id: "auto", name: "Auto" },
    { id: "gpt-5-mini", name: "GPT-5 mini" },
  ]);
  stop = vi.fn(async () => undefined);
}

let root: string;
let home: string;
let cwd: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "giopilot-harness-"));
  home = join(root, "home");
  cwd = join(root, "project");
  const p = join(cwd, ".giopilot");
  mkdirSync(join(p, "skills", "git-commit"), { recursive: true });
  mkdirSync(join(p, "extensions"), { recursive: true });
  writeFileSync(
    join(p, "skills", "git-commit", "SKILL.md"),
    "---\nname: git-commit\ndescription: Write a commit\n---\n\nDo the commit.",
  );
  writeFileSync(
    join(p, "extensions", "hello.mjs"),
    `export default function (gio) {
       gio.registerTool({ name: "deploy" });
       gio.registerCommand("ping", (args, ctx) => ctx.print("pong"));
       gio.addSystemPrompt("Prefer conventional commits.");
     }`,
  );
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

async function build(render = {}) {
  const config = loadConfig({ home, cwd });
  const client = new FakeClient();
  const harness = await createHarness(config, { clientFactory: () => client, render });
  return { harness, client };
}

describe("createHarness", () => {
  it("creates a session with a replace-mode system prompt containing skills and fragments", async () => {
    const { client } = await build();
    expect(client.createSession).toHaveBeenCalledOnce();
    const sm = client.lastConfig?.systemMessage as { mode: string; content: string };
    expect(sm.mode).toBe("replace");
    expect(sm.content).toContain("git-commit: Write a commit");
    expect(sm.content).toContain("Prefer conventional commits.");
  });

  it("registers load_skill plus extension tools", async () => {
    const { client } = await build();
    const tools = client.lastConfig?.tools as { name: string }[];
    const names = tools.map((t) => t.name);
    expect(names).toContain("load_skill");
    expect(names).toContain("deploy");
  });

  it("passes the configured model and enables streaming", async () => {
    const { client } = await build();
    expect(client.lastConfig?.model).toBe("auto");
    expect(client.lastConfig?.streaming).toBe(true);
  });

  it("exposes discovered skills and extension commands", async () => {
    const { harness } = await build();
    expect(harness.skills.map((s) => s.name)).toEqual(["git-commit"]);
    expect(harness.commands.has("ping")).toBe(true);
  });

  it("sendTurn forwards the prompt to the session", async () => {
    const { harness, client } = await build();
    await harness.sendTurn("hello");
    expect(client.session.sendAndWait).toHaveBeenCalledWith("hello");
  });

  it("routes streaming deltas and tool notices to render hooks", async () => {
    const onDelta = vi.fn();
    const onToolStart = vi.fn();
    const { client } = await build({ onDelta, onToolStart });
    client.session.emit("assistant.message_delta", { data: { deltaContent: "hi" } });
    client.session.emit("tool.execution_start", { data: { toolName: "load_skill" } });
    expect(onDelta).toHaveBeenCalledWith("hi");
    expect(onToolStart).toHaveBeenCalledWith("load_skill");
  });

  it("loadSkillBody returns the body for a known skill and null otherwise", async () => {
    const { harness } = await build();
    expect(harness.loadSkillBody("git-commit")).toBe("Do the commit.");
    expect(harness.loadSkillBody("nope")).toBeNull();
  });

  it("stop tears down the client", async () => {
    const { harness, client } = await build();
    await harness.stop();
    expect(client.stop).toHaveBeenCalledOnce();
  });

  it("exposes the current model", async () => {
    const { harness } = await build();
    expect(harness.model).toBe("auto");
  });

  it("listModels returns the client's models", async () => {
    const { harness } = await build();
    const models = await harness.listModels();
    expect(models.map((m) => m.id)).toEqual(["auto", "gpt-5-mini"]);
  });

  it("setModel recreates the session with the new model", async () => {
    const { harness, client } = await build();
    await harness.setModel("gpt-5-mini");
    expect(harness.model).toBe("gpt-5-mini");
    expect(client.createSession).toHaveBeenCalledTimes(2);
    expect(client.lastConfig?.model).toBe("gpt-5-mini");
  });

  it("re-wires streaming after a model switch", async () => {
    const onDelta = vi.fn();
    const { harness, client } = await build({ onDelta });
    await harness.setModel("gpt-5-mini");
    client.session.emit("assistant.message_delta", { data: { deltaContent: "x" } });
    expect(onDelta).toHaveBeenCalledWith("x");
  });
});
