import type { AbstainReason, HeuristicScore, Tier } from "./core/types";
import type { JudgeResult } from "./judge/types";

export interface Verdict {
  /** Final tier, or null when the meter abstains. */
  tier: Tier | null;
  abstain?: AbstainReason;
  heuristic: HeuristicScore;
  judgeTier?: Tier;
  likelihood?: number;
}

const RANK: Record<Tier, number> = { green: 0, yellow: 1, red: 2 };
const TIERS: Tier[] = ["green", "yellow", "red"];

export function judgeTier(likelihood: number): Tier {
  if (likelihood >= 0.7) return "red";
  if (likelihood >= 0.35) return "yellow";
  return "green";
}

/**
 * Heuristics and (optionally) the cloud judge each map to a tier; the final
 * tier is the rounded-up average, so the judge can bump the meter one step
 * either way but never silence an abstention. See ADR 0001.
 */
export function combine(heuristic: HeuristicScore, judge: JudgeResult | null): Verdict {
  if (heuristic.abstain) return { tier: null, abstain: heuristic.abstain, heuristic };
  if (!judge) return { tier: heuristic.tier, heuristic };
  const fromJudge = judgeTier(judge.likelihood);
  const tier = TIERS[Math.ceil((RANK[heuristic.tier] + RANK[fromJudge]) / 2)] as Tier;
  return { tier, heuristic, judgeTier: fromJudge, likelihood: judge.likelihood };
}
