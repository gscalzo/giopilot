import { describe, it, expect } from "vitest";
import {
  MINIMAL_SYSTEM_PROMPT,
  estimateTokens,
  assembleSystemPrompt,
} from "./systemPrompt.js";

describe("MINIMAL_SYSTEM_PROMPT", () => {
  it("stays under the Pi-style 1000-token budget", () => {
    expect(estimateTokens(MINIMAL_SYSTEM_PROMPT)).toBeLessThan(1000);
  });

  it("mentions load_skill so the model knows how to expand skills", () => {
    expect(MINIMAL_SYSTEM_PROMPT).toContain("load_skill");
  });
});

describe("assembleSystemPrompt", () => {
  it("returns just the base prompt when nothing extra is provided", () => {
    const out = assembleSystemPrompt({});
    expect(out).toContain(MINIMAL_SYSTEM_PROMPT);
  });

  it("includes the skill manifest under a heading when given", () => {
    const out = assembleSystemPrompt({ skillManifest: "- git-commit: write a commit" });
    expect(out).toContain("git-commit: write a commit");
    expect(out).toMatch(/skill/i);
  });

  it("appends extension fragments", () => {
    const out = assembleSystemPrompt({ extensionFragments: ["Prefer conventional commits."] });
    expect(out).toContain("Prefer conventional commits.");
  });

  it("omits empty sections (no skills, no fragments)", () => {
    const out = assembleSystemPrompt({ skillManifest: "", extensionFragments: [] });
    expect(out.trim()).toBe(MINIMAL_SYSTEM_PROMPT.trim());
  });
});
