export interface MeterConfig {
  /** Whether the cloud judge is enabled at all. Heuristics always run. */
  enabled: boolean;
  /** OpenAI-compatible API base, e.g. "https://api.openai.com/v1". */
  baseUrl: string;
  /** Model name as the provider knows it. */
  model: string;
  apiKey: string;
}

export const CONFIG_KEY = "aitmConfig";

export const DEFAULT_CONFIG: MeterConfig = {
  enabled: false,
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  apiKey: "",
};

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
}

/** Merge possibly-partial stored config over the defaults, dropping junk. */
export function withDefaults(stored: unknown): MeterConfig {
  const partial = (typeof stored === "object" && stored !== null ? stored : {}) as Partial<MeterConfig>;
  return {
    enabled: partial.enabled === true,
    baseUrl: str(partial.baseUrl, DEFAULT_CONFIG.baseUrl).replace(/\/+$/, ""),
    model: str(partial.model, DEFAULT_CONFIG.model),
    apiKey: typeof partial.apiKey === "string" ? partial.apiKey.trim() : "",
  };
}

/** Load config from extension storage (chrome-only; not exercised in tests). */
export async function loadConfig(): Promise<MeterConfig> {
  const stored = await chrome.storage.local.get(CONFIG_KEY);
  return withDefaults(stored[CONFIG_KEY]);
}
