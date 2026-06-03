import { describe, it, expect, vi } from "vitest";
import { SessionController } from "./controller.js";
import type { Harness, ModelInfoLike } from "../harness.js";
import type { ExtensionCommand } from "../extensions/api.js";

function makeHarness(overrides: Partial<Harness> = {}): Harness {
  return {
    model: "auto",
    skills: [{ name: "git-commit", description: "Write a commit", path: "/x/SKILL.md" }],
    commands: new Map<string, ExtensionCommand>(),
    extensionResults: [],
    systemPrompt: "",
    sendTurn: vi.fn(async () => undefined),
    loadSkillBody: vi.fn(() => null),
    listModels: vi.fn(async (): Promise<ModelInfoLike[]> => [
      { id: "auto", name: "Auto" },
      { id: "gpt-5-mini", name: "GPT-5 mini" },
    ]),
    setModel: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
    ...overrides,
  };
}

function attached(overrides?: Partial<Harness>) {
  const harness = makeHarness(overrides);
  const c = new SessionController();
  c.attach(harness);
  return { c, harness };
}

describe("SessionController", () => {
  it("adopts the harness model on attach", () => {
    const { c } = attached();
    expect(c.state.model).toBe("auto");
  });

  it("notifies subscribers when state changes", async () => {
    const { c } = attached();
    const seen = vi.fn();
    c.subscribe(seen);
    await c.submit("hello");
    expect(seen).toHaveBeenCalled();
  });

  it("adds a user line and sends a plain prompt", async () => {
    const { c, harness } = attached();
    await c.submit("fix the bug");
    expect(harness.sendTurn).toHaveBeenCalledWith("fix the bug");
    expect(c.state.lines).toContainEqual({ role: "user", text: "fix the bug" });
  });

  it("ignores blank input", async () => {
    const { c, harness } = attached();
    await c.submit("   ");
    expect(harness.sendTurn).not.toHaveBeenCalled();
    expect(c.state.lines).toEqual([]);
  });

  it("merges consecutive assistant deltas into one line", () => {
    const { c } = attached();
    const hooks = c.renderHooks();
    hooks.onDelta?.("Hel");
    hooks.onDelta?.("lo");
    expect(c.state.lines).toContainEqual({ role: "assistant", text: "Hello" });
    expect(c.state.lines.filter((l) => l.role === "assistant")).toHaveLength(1);
  });

  it("renders tool notices and resets status on idle", () => {
    const { c } = attached();
    const hooks = c.renderHooks();
    hooks.onToolStart?.("load_skill");
    expect(c.state.lines).toContainEqual({ role: "tool", text: "[tool: load_skill]" });
    c.state.status = "thinking";
    hooks.onIdle?.();
    expect(c.state.status).toBe("idle");
  });

  it("sets thinking while a turn is in flight", async () => {
    let resolve: () => void = () => {};
    const harness = makeHarness({
      sendTurn: vi.fn(() => new Promise<void>((r) => (resolve = r))),
    });
    const c = new SessionController();
    c.attach(harness);
    const p = c.submit("go");
    expect(c.state.status).toBe("thinking");
    resolve();
    await p;
    expect(c.state.status).toBe("idle");
  });

  it("/skills prints the manifest as a system line", async () => {
    const { c } = attached();
    await c.submit("/skills");
    expect(c.state.lines.some((l) => l.text.includes("git-commit: Write a commit"))).toBe(true);
  });

  it("/exit calls onExit", async () => {
    const { c } = attached();
    const onExit = vi.fn();
    c.onExit = onExit;
    await c.submit("/exit");
    expect(onExit).toHaveBeenCalled();
  });

  it("/model opens the picker populated from listModels", async () => {
    const { c } = attached();
    await c.submit("/model");
    expect(c.state.pickerOpen).toBe(true);
    expect(c.state.models).toEqual([
      { label: "Auto", value: "auto" },
      { label: "GPT-5 mini", value: "gpt-5-mini" },
    ]);
  });

  it("chooseModel switches the model and closes the picker", async () => {
    const { c, harness } = attached();
    await c.submit("/model");
    await c.chooseModel("gpt-5-mini");
    expect(harness.setModel).toHaveBeenCalledWith("gpt-5-mini");
    expect(c.state.model).toBe("gpt-5-mini");
    expect(c.state.pickerOpen).toBe(false);
    expect(c.state.lines.some((l) => l.text.includes("gpt-5-mini"))).toBe(true);
  });

  it("note adds a system line", () => {
    const { c } = attached();
    c.note("extension failed: x");
    expect(c.state.lines).toContainEqual({ role: "system", text: "extension failed: x" });
  });

  it("cancelModelPicker closes the picker without switching", async () => {
    const { c, harness } = attached();
    await c.submit("/model");
    c.cancelModelPicker();
    expect(c.state.pickerOpen).toBe(false);
    expect(harness.setModel).not.toHaveBeenCalled();
  });
});
