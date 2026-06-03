import { describe, it, expect, vi } from "vitest";
import { render } from "ink-testing-library";
import { App } from "./App.js";
import { SessionController } from "./controller.js";
import type { Harness } from "../harness.js";
import type { ExtensionCommand } from "../extensions/api.js";

function fakeHarness(): Harness {
  return {
    model: "auto",
    skills: [],
    commands: new Map<string, ExtensionCommand>(),
    extensionResults: [],
    systemPrompt: "",
    sendTurn: vi.fn(async () => undefined),
    loadSkillBody: vi.fn(() => null),
    listModels: vi.fn(async () => []),
    setModel: vi.fn(async () => undefined),
    stop: vi.fn(async () => undefined),
  };
}

function flush() {
  return new Promise((r) => setTimeout(r, 10));
}

describe("App", () => {
  it("renders the header with the current model and the input placeholder", () => {
    const controller = new SessionController();
    controller.attach(fakeHarness());
    const { lastFrame, unmount } = render(<App controller={controller} />);
    const frame = lastFrame() ?? "";
    expect(frame).toContain("giopilot");
    expect(frame).toContain("model: auto");
    expect(frame).toMatch(/\/help/);
    unmount();
  });

  it("re-renders transcript lines when the controller changes", async () => {
    const controller = new SessionController();
    controller.attach(fakeHarness());
    const { lastFrame, unmount } = render(<App controller={controller} />);
    await flush(); // let the mount effect register the subscription
    controller.note("a system note");
    await flush();
    expect(lastFrame()).toContain("a system note");
    unmount();
  });
});
