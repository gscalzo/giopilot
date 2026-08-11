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
    });
    expect(config).toEqual({
      enabled: true,
      baseUrl: "https://api.example.com/v1",
      model: "my-model",
      apiKey: "sk-123",
    });
  });

  it("drops junk values back to defaults", () => {
    const config = withDefaults({ enabled: "yes", baseUrl: 42, model: "", apiKey: null });
    expect(config).toEqual(DEFAULT_CONFIG);
  });
});
