export interface Completion {
  /** Matching commands, each with a leading slash, sorted. */
  matches: string[];
  /** The input completed to the longest common prefix of the matches. */
  completed: string;
}

function longestCommonPrefix(values: string[]): string {
  if (values.length === 0) return "";
  let prefix = values[0] ?? "";
  for (const value of values) {
    while (!value.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return prefix;
}

/**
 * Compute command autocomplete for the current input against the available
 * command names (bare tokens, no leading slash, caller-supplied order — the
 * caller owns sorting). Only completes the command token itself — once the
 * input contains a space (arguments), it stops.
 */
export function completeCommand(input: string, names: string[]): Completion {
  if (!input.startsWith("/")) return { matches: [], completed: input };

  const token = input.slice(1);
  if (token.includes(" ")) return { matches: [], completed: input };

  const hits = names.filter((n) => n.startsWith(token));
  if (hits.length === 0) return { matches: [], completed: input };

  return {
    matches: hits.map((n) => `/${n}`),
    completed: `/${longestCommonPrefix(hits)}`,
  };
}
