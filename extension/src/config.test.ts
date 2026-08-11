import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, withDefaults } from "./config";

describe("withDefaults", () => {
  it("returns defaults for missing config", () => {
    expect(withDefaults(undefined)).toEqual(DEFAULT_CONFIG);
  });

  it("keeps valid stored values and trims them", () => {
    const config = withDefaults({
      enabled: true,
      baseUrl: "https://api.example.com/v1/",
      model: " my-model ",
      apiKey: " sk-123 ",
      checkComments: false,
    });
    expect(config).toEqual({
      enabled: true,
      baseUrl: "https://api.example.com/v1",
      model: "my-model",
      apiKey: "sk-123",
      checkComments: false,
    });
  });

  it("round-trips an explicit enabled: false", () => {
    const config = withDefaults({ enabled: false });
    expect(config.enabled).toBe(false);
  });

  it("drops junk values back to defaults", () => {
    const config = withDefaults({ enabled: "yes", baseUrl: 42, model: "", apiKey: null, checkComments: "yes" });
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("falls back to enabled: true for a junk enabled value", () => {
    const config = withDefaults({ enabled: "yes" });
    expect(config.enabled).toBe(true);
  });
});
