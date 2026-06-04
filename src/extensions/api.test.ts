import { describe, it, expect, vi } from "vitest";
import { createExtensionRegistry } from "./api.js";
import type { Tool } from "@github/copilot-sdk";

const fakeTool = { name: "deploy" } as unknown as Tool<unknown>;

describe("createExtensionRegistry", () => {
  it("exposes the settings to extensions", () => {
    const reg = createExtensionRegistry({ model: "gpt-5" });
    expect(reg.api.settings.model).toBe("gpt-5");
  });

  it("collects registered tools", () => {
    const reg = createExtensionRegistry({ model: "gpt-5" });
    reg.api.registerTool(fakeTool);
    expect(reg.tools).toEqual([fakeTool]);
  });

  it("collects commands keyed by name", () => {
    const reg = createExtensionRegistry({ model: "gpt-5" });
    const handler = vi.fn();
    reg.api.registerCommand("ping", handler);
    expect(reg.commands.get("ping")?.handler).toBe(handler);
  });

  it("collects system-prompt fragments in order", () => {
    const reg = createExtensionRegistry({ model: "gpt-5" });
    reg.api.addSystemPrompt("first");
    reg.api.addSystemPrompt("second");
    expect(reg.fragments).toEqual(["first", "second"]);
  });

  it("collects permission gates", () => {
    const reg = createExtensionRegistry({ model: "gpt-5" });
    const gate = () => undefined;
    reg.api.gatePermission(gate);
    expect(reg.gates).toEqual([gate]);
  });
});
