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

  it("shows command suggestions while typing a slash command", async () => {
    const controller = new SessionController();
    controller.attach(fakeHarness());
    const { lastFrame, stdin, unmount } = render(<App controller={controller} />);
    await flush();
    stdin.write("/s");
    await flush();
    expect(lastFrame()).toContain("/skills");
    unmount();
  });

  it("enters shell mode on !, showing a ! glyph and the command without the bang", async () => {
    const controller = new SessionController();
    controller.attach(fakeHarness());
    const { lastFrame, stdin, unmount } = render(<App controller={controller} />);
    await flush();
    expect(lastFrame()).toContain("›"); // normal prompt glyph at idle
    stdin.write("!ls -la");
    await flush();
    const frame = lastFrame() ?? "";
    expect(frame).toContain("! ls -la"); // ! glyph + command, no doubled bang
    expect(frame).not.toContain("!!");
    expect(frame).not.toContain("›");
    unmount();
  });

  it("leaves shell mode when the command is erased back to empty", async () => {
    const controller = new SessionController();
    controller.attach(fakeHarness());
    const { lastFrame, stdin, unmount } = render(<App controller={controller} />);
    await flush();
    stdin.write("!a");
    await flush();
    expect(lastFrame()).not.toContain("›");
    stdin.write(""); // backspace removes the "a", leaving shell mode
    await flush();
    expect(lastFrame()).toContain("›");
    unmount();
  });

  it("Tab completes to the longest common prefix", async () => {
    const controller = new SessionController();
    controller.attach(fakeHarness());
    const { lastFrame, stdin, unmount } = render(<App controller={controller} />);
    await flush();
    stdin.write("/mo");
    await flush();
    stdin.write("\t");
    await flush();
    expect(lastFrame()).toContain("/model");
    unmount();
  });
});
