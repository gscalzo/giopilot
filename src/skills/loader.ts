import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

/** Metadata for one discovered skill. The full body is read lazily. */
export interface SkillMeta {
  /** Skill identifier (frontmatter `name`, defaulting to the directory name). */
  name: string;
  /** One-line description from frontmatter (empty string if absent). */
  description: string;
  /** Absolute path to the SKILL.md file. */
  path: string;
}

interface Parsed {
  frontmatter: Record<string, unknown>;
  body: string;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

function splitFrontmatter(raw: string): Parsed {
  const match = FRONTMATTER_RE.exec(raw);
  if (!match) return { frontmatter: {}, body: raw };
  let frontmatter: Record<string, unknown> = {};
  try {
    const parsed = parseYaml(match[1] ?? "");
    if (parsed && typeof parsed === "object") frontmatter = parsed as Record<string, unknown>;
  } catch {
    frontmatter = {};
  }
  return { frontmatter, body: raw.slice(match[0].length).replace(/^\n+/, "") };
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function loadSkillDir(skillDir: string, dirName: string): SkillMeta | null {
  const file = join(skillDir, dirName, "SKILL.md");
  if (!existsSync(file)) return null;
  const { frontmatter } = splitFrontmatter(readFileSync(file, "utf8"));
  return {
    name: str(frontmatter.name) || dirName,
    description: str(frontmatter.description),
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
  const { body } = splitFrontmatter(readFileSync(skill.path, "utf8"));
  return body;
}
