import { describe, expect, it } from "vitest";
import { PROVIDERS, findProvider, supportsJsonMode } from "./providers";

describe("PROVIDERS", () => {
  it("has an openai preset", () => {
    const openai = PROVIDERS.find((p) => p.id === "openai");
    expect(openai).toEqual({
      id: "openai",
      label: "OpenAI",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-5.6-luna",
      distillModel: "gpt-5.6-terra",
      supportsJsonMode: true,
      note: "Pay-as-you-go — billed per token across OpenAI's standard pricing tiers.",
      tokenUrl: "https://platform.openai.com/api-keys",
    });
  });

  it("has a hetzner preset", () => {
    const hetzner = PROVIDERS.find((p) => p.id === "hetzner");
    expect(hetzner).toEqual({
      id: "hetzner",
      label: "Hetzner Inference (experiment)",
      baseUrl: "https://inference.hetzner.com/api/v1",
      model: "Qwen/Qwen3.6-35B-A3B-FP8",
      distillModel: "Qwen/Qwen3.6-35B-A3B-FP8",
      supportsJsonMode: false,
      note: "EU-hosted experiment — no billing, no SLA, single model; distillation uses the same model as judging.",
      tokenUrl: "https://experiments.hetzner.com",
    });
  });
});

describe("findProvider", () => {
  it("matches openai by exact base URL", () => {
    expect(findProvider("https://api.openai.com/v1")?.id).toBe("openai");
  });

  it("matches hetzner by exact base URL", () => {
    expect(findProvider("https://inference.hetzner.com/api/v1")?.id).toBe("hetzner");
  });

  it("matches ignoring a trailing slash", () => {
    expect(findProvider("https://api.openai.com/v1/")?.id).toBe("openai");
  });

  it("matches ignoring mixed case", () => {
    expect(findProvider("HTTPS://API.OPENAI.COM/v1")?.id).toBe("openai");
  });

  it("matches ignoring both trailing slash and mixed case", () => {
    expect(findProvider("HTTPS://Inference.Hetzner.com/API/v1/")?.id).toBe("hetzner");
  });

  it("returns undefined for a custom URL", () => {
    expect(findProvider("https://my-custom-llm.example.com/v1")).toBeUndefined();
  });
});

describe("supportsJsonMode", () => {
  it("is false for hetzner", () => {
    expect(supportsJsonMode("https://inference.hetzner.com/api/v1")).toBe(false);
  });

  it("is true for openai", () => {
    expect(supportsJsonMode("https://api.openai.com/v1")).toBe(true);
  });

  it("is true for an unknown/custom URL", () => {
    expect(supportsJsonMode("https://my-custom-llm.example.com/v1")).toBe(true);
  });
});
