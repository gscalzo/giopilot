import { describe, it, expect } from "vitest";
import { manifestLine, manifestLines } from "./manifest.js";

describe("manifestLine", () => {
  it("renders name and description", () => {
    expect(manifestLine("git-commit", "Write a commit")).toBe("- git-commit: Write a commit");
  });

  it("falls back when there is no description", () => {
    expect(manifestLine("plain", "")).toBe("- plain: (no description)");
  });
});

describe("manifestLines", () => {
  it("renders one line per item", () => {
    expect(
      manifestLines([
        { name: "a", description: "first" },
        { name: "b", description: "second" },
      ]),
    ).toBe("- a: first\n- b: second");
  });

  it("returns an empty string for no items", () => {
    expect(manifestLines([])).toBe("");
  });
});
