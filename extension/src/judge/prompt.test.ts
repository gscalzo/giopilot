import { describe, expect, it } from "vitest";
import { DEFAULT_SKILL_BODY, buildSystemPrompt, defaultRubric } from "./prompt";

function config(skillText = "", downloadedSkill = ""): { skillText: string; downloadedSkill: string } {
  return { skillText, downloadedSkill };
}

describe("DEFAULT_SKILL_BODY", () => {
  it("is the vendored blader/humanizer skill with its frontmatter stripped", () => {
    expect(DEFAULT_SKILL_BODY).toMatch(/em dash/i);
    expect(DEFAULT_SKILL_BODY).toMatch(/rule of three/i);
    expect(DEFAULT_SKILL_BODY.startsWith("---")).toBe(false);
    expect(DEFAULT_SKILL_BODY).not.toContain("name: humanizer");
  });
});

describe("defaultRubric", () => {
  it("falls back to the bundled snapshot when nothing was downloaded", () => {
    expect(defaultRubric("")).toBe(DEFAULT_SKILL_BODY);
  });

  it("prefers a downloaded copy, stripping its frontmatter", () => {
    expect(defaultRubric("---\nname: humanizer\n---\nFresh upstream text.")).toBe(
      "Fresh upstream text.",
    );
  });
});

describe("buildSystemPrompt", () => {
  it("wraps the rubric in the judging preamble and appends the JSON contract", () => {
    const prompt = buildSystemPrompt(config());
    expect(prompt).toContain("judge, not an editor");
    expect(prompt).toMatch(/em dash/i);
    expect(prompt).toContain('"likelihood"');
    expect(prompt).toContain("copied verbatim");
  });

  it("uses the downloaded skill over the bundled snapshot", () => {
    const prompt = buildSystemPrompt(config("", "---\nname: x\n---\nDownloaded rubric only."));
    expect(prompt).toContain("Downloaded rubric only.");
    expect(prompt).not.toMatch(/rule of three/i);
  });

  it("lets a user override beat both, keeping preamble and contract", () => {
    const prompt = buildSystemPrompt(config("Only flag excessive emojis.", "downloaded text"));
    expect(prompt).toContain("Only flag excessive emojis.");
    expect(prompt).not.toContain("downloaded text");
    expect(prompt).toContain("judge, not an editor");
    expect(prompt).toContain('"likelihood"');
  });

  it("treats a whitespace-only override as unset", () => {
    expect(buildSystemPrompt(config("  \n "))).toBe(buildSystemPrompt(config()));
  });
});
