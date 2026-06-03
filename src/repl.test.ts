import { describe, it, expect, vi } from "vitest";
import { handleInput } from "./repl.js";
import type { Harness } from "./harness.js";
import type { ExtensionCommand } from "./extensions/api.js";

function makeHarness(overrides: Partial<Harness> = {}): Harness {
  const commands = new Map<string, ExtensionCommand>();
  return {
    skills: [{ name: "git-commit", description: "Write a commit", path: "/x/SKILL.md" }],
    commands,
    extensionResults: [],
    systemPrompt: "",
    sendTurn: vi.fn(async () => undefined),
    loadSkillBody: vi.fn((name: string) => (name === "git-commit" ? "Do the commit." : null)),
    stop: vi.fn(async () => undefined),
    ...overrides,
  };
}

function makeIO() {
  const lines: string[] = [];
  return { io: { print: (t: string) => lines.push(t) }, lines };
}

describe("handleInput", () => {
  it("ignores blank lines", async () => {
    const h = makeHarness();
    const { io } = makeIO();
    expect(await handleInput("   ", h, io)).toBe("continue");
    expect(h.sendTurn).not.toHaveBeenCalled();
  });

  it("sends plain text as a turn", async () => {
    const h = makeHarness();
    const { io } = makeIO();
    expect(await handleInput("fix the bug", h, io)).toBe("continue");
    expect(h.sendTurn).toHaveBeenCalledWith("fix the bug");
  });

  it("/exit and /quit end the loop", async () => {
    const h = makeHarness();
    const { io } = makeIO();
    expect(await handleInput("/exit", h, io)).toBe("exit");
    expect(await handleInput("/quit", h, io)).toBe("exit");
  });

  it("/model requests the model picker", async () => {
    const h = makeHarness();
    const { io } = makeIO();
    expect(await handleInput("/model", h, io)).toBe("model");
    expect(h.sendTurn).not.toHaveBeenCalled();
  });

  it("/help lists how skills work", async () => {
    const h = makeHarness();
    const { io, lines } = makeIO();
    await handleInput("/help", h, io);
    expect(lines.join("\n")).toMatch(/skill/i);
  });

  it("/skills prints the one-line manifest", async () => {
    const h = makeHarness();
    const { io, lines } = makeIO();
    await handleInput("/skills", h, io);
    expect(lines.join("\n")).toContain("git-commit: Write a commit");
  });

  it("/skill:name injects the skill body as a turn", async () => {
    const h = makeHarness();
    const { io } = makeIO();
    await handleInput("/skill:git-commit", h, io);
    expect(h.sendTurn).toHaveBeenCalledOnce();
    expect((h.sendTurn as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain("Do the commit.");
  });

  it("/skill:unknown reports it is not found without sending a turn", async () => {
    const h = makeHarness();
    const { io, lines } = makeIO();
    await handleInput("/skill:nope", h, io);
    expect(lines.join("\n")).toMatch(/not found|unknown/i);
    expect(h.sendTurn).not.toHaveBeenCalled();
  });

  it("runs a registered extension command with args and a printer", async () => {
    const h = makeHarness();
    const handler = vi.fn((args: string, ctx: { print: (t: string) => void }) =>
      ctx.print(`pong ${args}`),
    );
    h.commands.set("ping", { name: "ping", handler });
    const { io, lines } = makeIO();
    await handleInput("/ping world", h, io);
    expect(handler).toHaveBeenCalled();
    expect(lines.join("\n")).toContain("pong world");
  });

  it("reports unknown slash commands", async () => {
    const h = makeHarness();
    const { io, lines } = makeIO();
    await handleInput("/nonsense", h, io);
    expect(lines.join("\n")).toMatch(/unknown command/i);
    expect(h.sendTurn).not.toHaveBeenCalled();
  });
});
