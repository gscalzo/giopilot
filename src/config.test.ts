import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "./config.js";

function makeDirs() {
  const root = mkdtempSync(join(tmpdir(), "giopilot-"));
  const home = join(root, "home");
  const cwd = join(root, "project");
  mkdirSync(home, { recursive: true });
  mkdirSync(cwd, { recursive: true });
  return { root, home, cwd };
}

describe("loadConfig", () => {
  let dirs: ReturnType<typeof makeDirs>;

  beforeEach(() => {
    dirs = makeDirs();
  });

  afterEach(() => {
    rmSync(dirs.root, { recursive: true, force: true });
  });

  it("returns defaults when no config exists", () => {
    const cfg = loadConfig({ home: dirs.home, cwd: dirs.cwd });
    expect(cfg.settings.model).toBe("gpt-5");
    expect(cfg.skillDirs).toEqual([]);
    expect(cfg.extensionDirs).toEqual([]);
  });

  it("reads model from global settings.json", () => {
    const g = join(dirs.home, ".giopilot");
    mkdirSync(g, { recursive: true });
    writeFileSync(join(g, "settings.json"), JSON.stringify({ model: "gpt-4.1" }));
    const cfg = loadConfig({ home: dirs.home, cwd: dirs.cwd });
    expect(cfg.settings.model).toBe("gpt-4.1");
  });

  it("project settings override global (project wins)", () => {
    const g = join(dirs.home, ".giopilot");
    const p = join(dirs.cwd, ".giopilot");
    mkdirSync(g, { recursive: true });
    mkdirSync(p, { recursive: true });
    writeFileSync(join(g, "settings.json"), JSON.stringify({ model: "global-model" }));
    writeFileSync(join(p, "settings.json"), JSON.stringify({ model: "project-model" }));
    const cfg = loadConfig({ home: dirs.home, cwd: dirs.cwd });
    expect(cfg.settings.model).toBe("project-model");
  });

  it("collects existing skill and extension directories from both scopes", () => {
    const g = join(dirs.home, ".giopilot");
    const p = join(dirs.cwd, ".giopilot");
    mkdirSync(join(g, "skills"), { recursive: true });
    mkdirSync(join(p, "skills"), { recursive: true });
    mkdirSync(join(p, "extensions"), { recursive: true });
    const cfg = loadConfig({ home: dirs.home, cwd: dirs.cwd });
    expect(cfg.skillDirs).toEqual([join(g, "skills"), join(p, "skills")]);
    expect(cfg.extensionDirs).toEqual([join(p, "extensions")]);
  });

  it("ignores malformed settings.json without throwing", () => {
    const p = join(dirs.cwd, ".giopilot");
    mkdirSync(p, { recursive: true });
    writeFileSync(join(p, "settings.json"), "{ not json");
    const cfg = loadConfig({ home: dirs.home, cwd: dirs.cwd });
    expect(cfg.settings.model).toBe("gpt-5");
  });
});
