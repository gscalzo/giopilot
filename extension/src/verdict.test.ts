import { describe, expect, it } from "vitest";
import type { HeuristicScore } from "./core/types";
import { combine, judgeTier } from "./verdict";

function heuristic(tier: HeuristicScore["tier"], abstain?: HeuristicScore["abstain"]): HeuristicScore {
  return { words: 100, totalWeight: 5, density: 5, tier, abstain };
}

describe("judgeTier", () => {
  it("maps likelihood to tiers", () => {
    expect(judgeTier(0.1)).toBe("green");
    expect(judgeTier(0.5)).toBe("yellow");
    expect(judgeTier(0.9)).toBe("red");
  });
});

describe("combine", () => {
  it("abstention wins regardless of the judge", () => {
    const verdict = combine(heuristic("red", "too-short"), { likelihood: 0.9, phrases: [] });
    expect(verdict.tier).toBeNull();
    expect(verdict.abstain).toBe("too-short");
  });

  it("uses the heuristic tier when no judge result exists", () => {
    expect(combine(heuristic("yellow"), null).tier).toBe("yellow");
  });

  it("averages tiers, rounding up", () => {
    expect(combine(heuristic("green"), { likelihood: 0.9, phrases: [] }).tier).toBe("yellow");
    expect(combine(heuristic("red"), { likelihood: 0.1, phrases: [] }).tier).toBe("yellow");
    expect(combine(heuristic("yellow"), { likelihood: 0.9, phrases: [] }).tier).toBe("red");
    expect(combine(heuristic("green"), { likelihood: 0.1, phrases: [] }).tier).toBe("green");
  });

  it("records the judge's contribution", () => {
    const verdict = combine(heuristic("yellow"), { likelihood: 0.8, phrases: [] });
    expect(verdict.judgeTier).toBe("red");
    expect(verdict.likelihood).toBe(0.8);
  });
});
