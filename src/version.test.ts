import { describe, it, expect, vi } from "vitest";
import { isNewer, checkForUpdate } from "./version.js";

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

describe("isNewer", () => {
  it("compares dotted numeric versions", () => {
    expect(isNewer("0.2.0", "0.1.0")).toBe(true);
    expect(isNewer("1.0.0", "0.9.9")).toBe(true);
    expect(isNewer("0.1.0", "0.1.0")).toBe(false);
    expect(isNewer("0.1.0", "0.2.0")).toBe(false);
  });

  it("tolerates a leading v and differing segment counts", () => {
    expect(isNewer("v1.2", "1.1.9")).toBe(true);
    expect(isNewer("1.0", "1.0.0")).toBe(false);
  });
});

describe("checkForUpdate", () => {
  it("reports an available update from the npm registry", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ "dist-tags": { latest: "0.2.0" } }));
    const info = await checkForUpdate("0.1.0", { fetchImpl });
    expect(info).toEqual({ current: "0.1.0", latest: "0.2.0", updateAvailable: true, source: "npm" });
  });

  it("reports up-to-date when latest equals current", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ "dist-tags": { latest: "0.1.0" } }));
    const info = await checkForUpdate("0.1.0", { fetchImpl });
    expect(info.updateAvailable).toBe(false);
    expect(info.source).toBe("npm");
  });

  it("falls back to GitHub releases when npm fails", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.includes("registry.npmjs.org")) return jsonResponse({}, false);
      return jsonResponse({ tag_name: "v0.3.0" });
    });
    const info = await checkForUpdate("0.1.0", { fetchImpl });
    expect(info).toEqual({ current: "0.1.0", latest: "0.3.0", updateAvailable: true, source: "github" });
  });

  it("reports source none when both sources fail", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });
    const info = await checkForUpdate("0.1.0", { fetchImpl });
    expect(info).toEqual({ current: "0.1.0", latest: null, updateAvailable: false, source: "none" });
  });
});
