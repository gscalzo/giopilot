import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRememberTool, createRecallTool } from "./tools.js";
import { listMemories } from "./store.js";

let dir: string;

beforeEach(() => {
  dir = join(mkdtempSync(join(tmpdir(), "giopilot-memtool-")), "memory");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("remember tool", () => {
  it("is named remember and persists a memory", async () => {
    const tool = createRememberTool(dir);
    expect(tool.name).toBe("remember");
    const result = (await tool.handler!(
      { name: "Dark mode", description: "Prefers dark", type: "user", content: "uses dark theme" },
      {} as never,
    )) as { saved: string };
    expect(result.saved).toBe("Dark mode");
    expect(listMemories(dir).map((m) => m.name)).toEqual(["Dark mode"]);
  });
});

describe("recall tool", () => {
  it("is named recall and returns matching memories", async () => {
    const remember = createRememberTool(dir);
    await remember.handler!({ name: "Deploy", content: "run npm publish" }, {} as never);
    const recall = createRecallTool(dir);
    expect(recall.name).toBe("recall");
    const result = (await recall.handler!({ query: "publish" }, {} as never)) as {
      matches: { name: string; body: string }[];
    };
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({ name: "Deploy", body: "run npm publish" });
  });

  it("returns an empty match list when nothing matches", async () => {
    const recall = createRecallTool(dir);
    const result = (await recall.handler!({ query: "nope" }, {} as never)) as { matches: unknown[] };
    expect(result.matches).toEqual([]);
  });
});
