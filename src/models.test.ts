import { describe, it, expect } from "vitest";
import { parseModelFlag, toModelChoices } from "./models.js";

describe("parseModelFlag", () => {
  it("returns no model and the original args when --model is absent", () => {
    expect(parseModelFlag(["do", "thing"])).toEqual({ model: undefined, rest: ["do", "thing"] });
  });

  it("parses --model <id> and removes both tokens", () => {
    expect(parseModelFlag(["--model", "gpt-5-mini", "fix", "bug"])).toEqual({
      model: "gpt-5-mini",
      rest: ["fix", "bug"],
    });
  });

  it("parses --model=<id>", () => {
    expect(parseModelFlag(["--model=auto", "go"])).toEqual({ model: "auto", rest: ["go"] });
  });

  it("ignores a trailing --model with no value", () => {
    expect(parseModelFlag(["--model"])).toEqual({ model: undefined, rest: [] });
  });
});

describe("toModelChoices", () => {
  it("maps models to label/value pairs, preferring name for the label", () => {
    expect(
      toModelChoices([
        { id: "auto", name: "Auto" },
        { id: "gpt-5-mini" },
      ]),
    ).toEqual([
      { label: "Auto", value: "auto" },
      { label: "gpt-5-mini", value: "gpt-5-mini" },
    ]);
  });

  it("returns an empty list for no models", () => {
    expect(toModelChoices([])).toEqual([]);
  });
});
