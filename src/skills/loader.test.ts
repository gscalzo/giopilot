import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discoverSkills, readSkillBody } from "./loader.js";

let root: string;
let skillsDir: string;

function writeSkill(name: string, content: string) {
  const dir = join(skillsDir, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "SKILL.md"), content);
  return dir;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "giopilot-skills-"));
  skillsDir = join(root, "skills");
  mkdirSync(skillsDir, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("discoverSkills", () => {
  it("returns an empty list when there are no skill dirs", () => {
    expect(discoverSkills([])).toEqual([]);
    expect(discoverSkills([join(root, "missing")])).toEqual([]);
  });

  it("parses frontmatter name and description", () => {
    writeSkill(
      "commit",
      "---\nname: git-commit\ndescription: Write a conventional commit\n---\n\nBody here.",
    );
    const skills = discoverSkills([skillsDir]);
    expect(skills).toHaveLength(1);
    expect(skills[0]).toMatchObject({
      name: "git-commit",
      description: "Write a conventional commit",
    });
  });

  it("defaults name to the directory when frontmatter omits it", () => {
    writeSkill("review", "---\ndescription: Review code\n---\nBody");
    const [skill] = discoverSkills([skillsDir]);
    expect(skill?.name).toBe("review");
    expect(skill?.description).toBe("Review code");
  });

  it("handles a SKILL.md with no frontmatter", () => {
    writeSkill("plain", "# Plain skill\nJust instructions.");
    const [skill] = discoverSkills([skillsDir]);
    expect(skill?.name).toBe("plain");
    expect(skill?.description).toBe("");
  });

  it("later directories override earlier ones with the same skill name", () => {
    const a = join(root, "a");
    const b = join(root, "b");
    mkdirSync(join(a, "dup"), { recursive: true });
    mkdirSync(join(b, "dup"), { recursive: true });
    writeFileSync(join(a, "dup", "SKILL.md"), "---\nname: dup\ndescription: from A\n---\nA");
    writeFileSync(join(b, "dup", "SKILL.md"), "---\nname: dup\ndescription: from B\n---\nB");
    const skills = discoverSkills([a, b]);
    expect(skills).toHaveLength(1);
    expect(skills[0]?.description).toBe("from B");
  });
});

describe("readSkillBody", () => {
  it("returns the markdown body without frontmatter", () => {
    const dir = writeSkill("commit", "---\nname: git-commit\n---\n\nStep 1\nStep 2");
    const [skill] = discoverSkills([skillsDir]);
    expect(skill?.path).toBe(join(dir, "SKILL.md"));
    expect(readSkillBody(skill!)).toBe("Step 1\nStep 2");
  });

  it("returns the whole file when there is no frontmatter", () => {
    writeSkill("plain", "Just text");
    const [skill] = discoverSkills([skillsDir]);
    expect(readSkillBody(skill!)).toBe("Just text");
  });
});
