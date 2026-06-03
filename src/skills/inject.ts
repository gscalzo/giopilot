import { defineTool } from "@github/copilot-sdk";
import type { Tool } from "@github/copilot-sdk";
import { readSkillBody, type SkillMeta } from "./loader.js";

/** Build the one-line-per-skill manifest injected into the system prompt each turn. */
export function buildManifest(skills: SkillMeta[]): string {
  return skills
    .map((s) => `- ${s.name}: ${s.description || "(no description)"}`)
    .join("\n");
}

const loadSkillParams: Record<string, unknown> = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "The exact name of the skill to load, as listed in Available skills.",
    },
  },
  required: ["name"],
};

/**
 * The single custom tool in the MVP. It lazily loads a skill's full SKILL.md body
 * on demand, keeping the per-turn context small (Pi-style lazy skills).
 */
export function createLoadSkillTool(skills: SkillMeta[]): Tool<{ name: string }> {
  const byName = new Map(skills.map((s) => [s.name, s]));
  return defineTool<{ name: string }>("load_skill", {
    description:
      "Load the full instructions for a named skill from the Available skills list. " +
      "Call this when a task matches a skill, then follow the returned instructions.",
    parameters: loadSkillParams,
    handler: ({ name }) => {
      const skill = byName.get(name);
      if (!skill) {
        return { error: `Unknown skill: ${name}`, available: [...byName.keys()] };
      }
      return { name: skill.name, body: readSkillBody(skill) };
    },
  });
}
