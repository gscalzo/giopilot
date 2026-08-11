/** A selectable OpenAI-compatible provider preset for the Options page. */
export interface ProviderPreset {
  id: string;
  label: string;
  baseUrl: string;
  /** Per-post judge model. */
  model: string;
  /** Model used for the one-shot skill distillation. */
  distillModel: string;
  supportsJsonMode: boolean;
  /** One-or-two sentence caveat shown in Options. */
  note: string;
  /** Where to get an API key for this provider. */
  tokenUrl: string;
}

export const PROVIDERS: ProviderPreset[] = [
  {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-5.6-luna",
    distillModel: "gpt-5.6-terra",
    supportsJsonMode: true,
    note: "Pay-as-you-go — billed per token across OpenAI's standard pricing tiers.",
    tokenUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "hetzner",
    label: "Hetzner Inference (experiment)",
    baseUrl: "https://inference.hetzner.com/api/v1",
    model: "Qwen/Qwen3.6-35B-A3B-FP8",
    distillModel: "Qwen/Qwen3.6-35B-A3B-FP8",
    supportsJsonMode: false,
    note: "EU-hosted experiment — no billing, no SLA, single model; distillation uses the same model as judging.",
    tokenUrl: "https://experiments.hetzner.com",
  },
];

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "").toLowerCase();
}

/** Find the preset matching a base URL, ignoring trailing slashes and case. */
export function findProvider(baseUrl: string): ProviderPreset | undefined {
  const normalized = normalizeBaseUrl(baseUrl);
  return PROVIDERS.find((preset) => normalizeBaseUrl(preset.baseUrl) === normalized);
}

/**
 * Whether a base URL's JSON mode support is known-good. Unknown/custom
 * OpenAI-compatible servers generally support it, so default to true.
 */
export function supportsJsonMode(baseUrl: string): boolean {
  return findProvider(baseUrl)?.supportsJsonMode ?? true;
}
