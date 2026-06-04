import { describe, it, expect } from "vitest";
import { formatStatusLine } from "./statusline.js";

describe("formatStatusLine", () => {
  it("always shows model and status", () => {
    expect(formatStatusLine({ model: "auto", status: "idle" })).toBe("model: auto · idle");
  });

  it("includes the branch when present", () => {
    expect(formatStatusLine({ model: "auto", status: "idle", branch: "main" })).toContain("⎇ main");
  });

  it("includes credits when present", () => {
    expect(formatStatusLine({ model: "auto", status: "idle", credits: "194/200 (97%)" })).toContain(
      "◆ 194/200 (97%)",
    );
  });

  it("omits null/empty segments", () => {
    const out = formatStatusLine({ model: "auto", status: "idle", branch: null, credits: "" });
    expect(out).toBe("model: auto · idle");
  });

  it("joins all segments with a middot in order", () => {
    expect(
      formatStatusLine({ model: "gpt-5-mini", status: "thinking", branch: "dev", credits: "10/300 (3%)" }),
    ).toBe("model: gpt-5-mini · thinking · ⎇ dev · ◆ 10/300 (3%)");
  });
});
