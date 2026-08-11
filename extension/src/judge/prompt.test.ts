import { describe, expect, it } from "vitest";
import { DEFAULT_SKILL_BODY, buildSystemPrompt } from "./prompt";

describe("DEFAULT_SKILL_BODY", () => {
  it("is the bundled humanizer skill with its frontmatter stripped", () => {
    expect(DEFAULT_SKILL_BODY).toContain("Em dashes");
    expect(DEFAULT_SKILL_BODY).toContain("contrast template");
    expect(DEFAULT_SKILL_BODY.startsWith("---")).toBe(false);
    expect(DEFAULT_SKILL_BODY).not.toContain("name: humanizer");
  });
});

describe("buildSystemPrompt", () => {
  it("uses the bundled rubric and appends the JSON contract when no override is set", () => {
    const prompt = buildSystemPrompt("");
    expect(prompt).toContain("Em dashes");
    expect(prompt).toContain('"likelihood"');
    expect(prompt).toContain("copied verbatim");
  });

  it("replaces the rubric with a user override but keeps the contract", () => {
    const prompt = buildSystemPrompt("My own rubric: flag only excessive emojis.");
    expect(prompt.startsWith("My own rubric")).toBe(true);
    expect(prompt).not.toContain("Em dashes");
    expect(prompt).toContain('"likelihood"');
  });

  it("treats a whitespace-only override as unset", () => {
    expect(buildSystemPrompt("  \n ")).toBe(buildSystemPrompt(""));
  });

  it("strips frontmatter from a pasted skill file", () => {
    const prompt = buildSystemPrompt("---\nname: custom\n---\nJudge harshly.");
    expect(prompt.startsWith("Judge harshly.")).toBe(true);
  });
});
