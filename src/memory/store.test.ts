import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  slugify,
  writeMemory,
  listMemories,
  readMemory,
  searchMemories,
  readIndex,
} from "./store.js";

let dir: string;

beforeEach(() => {
  dir = join(mkdtempSync(join(tmpdir(), "giopilot-mem-")), "memory");
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("slugify", () => {
  it("kebab-cases and trims", () => {
    expect(slugify("Likes Dark Mode!")).toBe("likes-dark-mode");
    expect(slugify("  API   key  ")).toBe("api-key");
  });
});

describe("writeMemory", () => {
  it("writes a frontmatter file and returns its path", () => {
    const path = writeMemory(dir, {
      name: "Dark mode",
      description: "Prefers dark mode",
      type: "user",
      body: "The user prefers a dark theme.",
    });
    expect(path).toBe(join(dir, "dark-mode.md"));
    const raw = readFileSync(path, "utf8");
    expect(raw).toContain("name: Dark mode");
    expect(raw).toContain("type: user");
    expect(raw).toContain("The user prefers a dark theme.");
  });

  it("maintains a MEMORY.md index with one line per memory", () => {
    writeMemory(dir, { name: "A", description: "first", body: "x" });
    writeMemory(dir, { name: "B", description: "second", body: "y" });
    const index = readIndex(dir);
    expect(index).toContain("- A: first");
    expect(index).toContain("- B: second");
  });

  it("updates in place when the same name is written again", () => {
    writeMemory(dir, { name: "A", description: "old", body: "1" });
    writeMemory(dir, { name: "A", description: "new", body: "2" });
    expect(listMemories(dir)).toHaveLength(1);
    expect(readMemory(dir, "A")).toBe("2");
    expect(readIndex(dir)).toContain("- A: new");
  });

  it("defaults type to reference", () => {
    const path = writeMemory(dir, { name: "A", body: "x" });
    expect(readFileSync(path, "utf8")).toContain("type: reference");
  });
});

describe("listMemories / readMemory / searchMemories", () => {
  beforeEach(() => {
    writeMemory(dir, { name: "Dark mode", description: "Prefers dark mode", type: "user", body: "dark theme" });
    writeMemory(dir, { name: "Deploy", description: "How to deploy", type: "project", body: "run npm publish" });
  });

  it("lists memory metadata, excluding the index", () => {
    const names = listMemories(dir).map((m) => m.name).sort();
    expect(names).toEqual(["Dark mode", "Deploy"]);
  });

  it("reads a memory body by name", () => {
    expect(readMemory(dir, "Deploy")).toBe("run npm publish");
    expect(readMemory(dir, "missing")).toBeNull();
  });

  it("searches across name, description, and body", () => {
    expect(searchMemories(dir, "publish").map((m) => m.name)).toEqual(["Deploy"]);
    expect(searchMemories(dir, "dark").map((m) => m.name)).toEqual(["Dark mode"]);
    expect(searchMemories(dir, "zzz")).toEqual([]);
  });

  it("returns empty results when the memory dir does not exist", () => {
    rmSync(dir, { recursive: true, force: true });
    expect(listMemories(dir)).toEqual([]);
    expect(readIndex(dir)).toBe("");
    expect(searchMemories(dir, "x")).toEqual([]);
  });
});
