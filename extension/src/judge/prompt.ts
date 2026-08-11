import humanizerSkill from "../../skills/humanizer/SKILL.md";

/**
 * The judge's rubric is the humanizer skill — vendored verbatim from
 * blader/humanizer (see skills/humanizer/UPSTREAM.json), optionally refreshed
 * at runtime from GitHub (config.downloadedSkill) and overridable by the user
 * (config.skillText). Precedence: override > downloaded > bundled snapshot.
 * The upstream skill is written as a rewriting tool, so a code-owned judging
 * preamble reframes its catalogue as a detection rubric, and the code-owned
 * JSON output contract is always appended — neither is editable, so rubric
 * updates can never break parsing. See ADR 0006 and ADR 0008.
 */

const JUDGING_PREAMBLE = [
  "You are a judge, not an editor. The reference below is the humanizer skill —",
  "a catalogue of the signs of AI-generated writing. Read the post you are given",
  "and estimate how strongly it exhibits those signs; do NOT rewrite anything.",
  "You are a pattern meter, not an authorship oracle: humans use these patterns",
  "too, so weigh density and combination, and be conservative with text that has",
  "genuine specifics or personal texture. Calibrate likelihood: below 0.35 reads",
  "mostly human; 0.35–0.7 noticeably AI-patterned; above 0.7 dense and formulaic.",
  "\n\n--- HUMANIZER SKILL (reference rubric) ---\n",
].join(" ");

const OUTPUT_CONTRACT = [
  "Reply with ONLY a JSON object of the shape",
  '{"likelihood": <number 0..1>, "summary": "<one sentence>",',
  ' "phrases": [{"quote": "<EXACT substring copied from the post>", "reason": "<why>"}]}.',
  "Include at most 10 phrases; every quote must be copied verbatim from the post.",
].join(" ");

function stripFrontmatter(markdown: string): string {
  return markdown.replace(/^---\n[\s\S]*?\n---\n/, "");
}

/** The bundled upstream snapshot, frontmatter stripped. */
export const DEFAULT_SKILL_BODY = stripFrontmatter(humanizerSkill).trim();

/** Effective default rubric: the runtime-downloaded copy if present, else the bundled snapshot. */
export function defaultRubric(downloadedSkill: string): string {
  const stripped = stripFrontmatter(downloadedSkill).trim();
  return stripped === "" ? DEFAULT_SKILL_BODY : stripped;
}

export interface RubricConfig {
  /** User override; empty = track the default. */
  skillText: string;
  /** Runtime-downloaded upstream copy; empty = use the bundled snapshot. */
  downloadedSkill: string;
}

/** Full system prompt: judging preamble + effective rubric + output contract. */
export function buildSystemPrompt(config: RubricConfig): string {
  const override = stripFrontmatter(config.skillText).trim();
  const rubric = override === "" ? defaultRubric(config.downloadedSkill) : override;
  return `${JUDGING_PREAMBLE}\n${rubric}\n\n${OUTPUT_CONTRACT}`;
}
