import type { MeterConfig } from "../config";
import type { Judge, JudgePhrase, JudgeResult } from "./types";

export class JudgeRequestError extends Error {}

const SYSTEM_PROMPT = [
  "You review a single social-media post and estimate how strongly it exhibits",
  "patterns typical of AI-generated writing: formulaic contrasts, uniform rhythm,",
  "stock vocabulary, engagement-formula endings. You are a pattern meter, not an",
  "authorship oracle. Reply with ONLY a JSON object of the shape",
  '{"likelihood": <number 0..1>, "summary": "<one sentence>",',
  ' "phrases": [{"quote": "<EXACT substring copied from the post>", "reason": "<why>"}]}.',
  "Include at most 10 phrases; every quote must be copied verbatim from the post.",
].join(" ");

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
}

function requestBody(model: string, text: string): unknown {
  return {
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
  };
}

function extractContent(data: ChatCompletionResponse): string {
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new JudgeRequestError("judge response had no message content");
  }
  return content;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function parsePhrases(value: unknown): JudgePhrase[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (p): p is JudgePhrase =>
        typeof p === "object" && p !== null &&
        typeof (p as JudgePhrase).quote === "string" &&
        typeof (p as JudgePhrase).reason === "string",
    )
    .slice(0, 10);
}

function toRecord(raw: unknown): Record<string, unknown> {
  return typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
}

function parseLikelihood(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new JudgeRequestError("judge response missing likelihood");
  }
  return clamp01(value);
}

export function parseJudgeResult(content: string): JudgeResult {
  const stripped = content.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  let raw: unknown;
  try {
    raw = JSON.parse(stripped);
  } catch {
    throw new JudgeRequestError("judge returned invalid JSON");
  }
  const record = toRecord(raw);
  return {
    likelihood: parseLikelihood(record.likelihood),
    summary: typeof record.summary === "string" ? record.summary : undefined,
    phrases: parsePhrases(record.phrases),
  };
}

async function requestJudgement(
  config: MeterConfig,
  fetchFn: typeof fetch,
  text: string,
): Promise<JudgeResult> {
  const response = await fetchFn(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(requestBody(config.model, text)),
  });
  if (!response.ok) {
    throw new JudgeRequestError(`judge request failed: HTTP ${response.status}`);
  }
  return parseJudgeResult(extractContent((await response.json()) as ChatCompletionResponse));
}

/** Works against any OpenAI-compatible /chat/completions endpoint. */
export function createOpenAiCompatibleJudge(
  config: MeterConfig,
  fetchFn: typeof fetch = fetch,
): Judge {
  return { judge: (text) => requestJudgement(config, fetchFn, text) };
}
