import type { ModelInfoLike } from "./harness.js";

/** A choice for the model picker (ink-select-input shape). */
export interface ModelChoice {
  label: string;
  value: string;
}

export interface ParsedModelFlag {
  /** The model id if --model was provided with a value, else undefined. */
  model: string | undefined;
  /** The remaining args with the flag tokens removed. */
  rest: string[];
}

/** Extract `--model <id>` or `--model=<id>` from argv, returning the rest. */
export function parseModelFlag(argv: string[]): ParsedModelFlag {
  const rest: string[] = [];
  let model: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? "";
    if (arg.startsWith("--model=")) {
      model = arg.slice("--model=".length);
      continue;
    }
    if (arg === "--model") {
      model = argv[i + 1];
      i++;
      continue;
    }
    rest.push(arg);
  }

  return { model, rest };
}

/** Map SDK models to picker choices, preferring the human name as the label. */
export function toModelChoices(models: ModelInfoLike[]): ModelChoice[] {
  return models.map((m) => ({ label: m.name ?? m.id, value: m.id }));
}
