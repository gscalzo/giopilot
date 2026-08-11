import humanizerSkill from "../../skills/humanizer/SKILL.md";

/**
 * The judge's rubric is the bundled humanizer skill (skills/humanizer/SKILL.md),
 * which users can override in Options. The JSON output contract below is
 * code-owned and always appended, so rubric edits can never break parsing.
 * See ADR 0006.
 */

const OUTPUT_CONTRACT = [
  "Reply with ONLY a JSON object of the shape",
  '{"likelihood": <number 0..1>, "summary": "<one sentence>",',
  ' "phrases": [{"quote": "<EXACT substring copied from the post>", "reason": "<why>"}]}.',
  "Include at most 10 phrases; every quote must be copied verbatim from the post.",
].join(" ");

function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\n[\s\S]*?\n---\n/, "");
}

/** The bundled rubric as shown/edited in Options: no frontmatter, no contract. */
export const DEFAULT_SKILL_BODY = stripFrontmatter(humanizerSkill).trim();

/** Full system prompt: the (possibly overridden) rubric plus the output contract. */
export function buildSystemPrompt(skillOverride: string): string {
  const rubric = skillOverride.trim() === "" ? DEFAULT_SKILL_BODY : stripFrontmatter(skillOverride).trim();
  return `${rubric}\n\n${OUTPUT_CONTRACT}`;
}
