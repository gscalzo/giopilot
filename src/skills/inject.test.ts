import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverSkills } from "./loader.js";
import { buildManifest, createLoadSkillTool } from "./inject.js";
import type { SkillMeta } from "./loader.js";

function meta(name: string, description: string): SkillMeta {
  return { name, description, path: `/tmp/${name}/SKILL.md` };
}

describe("buildManifest", () => {
  it("renders one line per skill", () => {
    const manifest = buildManifest([
      meta("git-commit", "Write a commit"),
      meta("review", "Review code"),
    ]);
    expect(manifest).toBe("- git-commit: Write a commit\n- review: Review code");
  });

  it("returns an empty string when there are no skills", () => {
    expect(buildManifest([])).toBe("");
  });

  it("handles skills without a description", () => {
    expect(buildManifest([meta("plain", "")])).toBe("- plain: (no description)");
  });
});

describe("createLoadSkillTool", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "giopilot-inject-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  function skillWith(name: string, body: string): SkillMeta[] {
    const dir = join(root, "skills", name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "SKILL.md"), `---\nname: ${name}\n---\n\n${body}`);
    return discoverSkills([join(root, "skills")]);
  }

  it("defines a tool named load_skill", () => {
    const tool = createLoadSkillTool([]);
    expect(tool.name).toBe("load_skill");
  });

  it("returns the full skill body for a known name", async () => {
    const skills = skillWith("git-commit", "Step 1\nStep 2");
    const tool = createLoadSkillTool(skills);
    const result = await tool.handler!({ name: "git-commit" }, {} as never);
    expect(result).toMatchObject({ name: "git-commit", body: "Step 1\nStep 2" });
  });

  it("returns an error object for an unknown skill", async () => {
    const tool = createLoadSkillTool(skillWith("known", "x"));
    const result = (await tool.handler!({ name: "nope" }, {} as never)) as {
      error: string;
      available: string[];
    };
    expect(result.error).toMatch(/unknown skill/i);
    expect(result.available).toContain("known");
  });
});
