import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "../frontmatter.js";

/** Metadata for one discovered skill. The full body is read lazily. */
export interface SkillMeta {
  /** Skill identifier (frontmatter `name`, defaulting to the directory name). */
  name: string;
  /** One-line description from frontmatter (empty string if absent). */
  description: string;
  /** Absolute path to the SKILL.md file. */
  path: string;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function loadSkillDir(skillDir: string, dirName: string): SkillMeta | null {
  const file = join(skillDir, dirName, "SKILL.md");
  if (!existsSync(file)) return null;
  const { data } = parseFrontmatter(readFileSync(file, "utf8"));
  return {
    name: str(data.name) || dirName,
    description: str(data.description),
    path: file,
  };
}

/**
 * Discover skills across the given directories (global first, then project).
 * Each immediate subdirectory containing a SKILL.md becomes a skill. When the
 * same skill `name` appears more than once, later directories win.
 */
export function discoverSkills(skillDirs: string[]): SkillMeta[] {
  const byName = new Map<string, SkillMeta>();
  for (const skillDir of skillDirs) {
    if (!existsSync(skillDir)) continue;
    for (const entry of readdirSync(skillDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skill = loadSkillDir(skillDir, entry.name);
      if (skill) byName.set(skill.name, skill);
    }
  }
  return [...byName.values()];
}

/** Read a skill's full markdown body (frontmatter stripped). */
export function readSkillBody(skill: SkillMeta): string {
  const { body } = parseFrontmatter(readFileSync(skill.path, "utf8"));
  return body;
}
