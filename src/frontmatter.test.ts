import { describe, it, expect } from "vitest";
import { parseFrontmatter, stringifyFrontmatter, frontmatterString } from "./frontmatter.js";

describe("parseFrontmatter", () => {
  it("parses data and strips the block plus leading newlines from the body", () => {
    const { data, body } = parseFrontmatter("---\nname: x\ndescription: y\n---\n\nBody line");
    expect(data).toEqual({ name: "x", description: "y" });
    expect(body).toBe("Body line");
  });

  it("returns the whole input as body when there is no frontmatter", () => {
    expect(parseFrontmatter("just text")).toEqual({ data: {}, body: "just text" });
  });

  it("tolerates invalid YAML", () => {
    const { data, body } = parseFrontmatter("---\n: : :\n---\nbody");
    expect(data).toEqual({});
    expect(body).toBe("body");
  });
});

describe("frontmatterString", () => {
  it("returns the string value when present", () => {
    expect(frontmatterString({ name: "x" }, "name")).toBe("x");
  });

  it("returns the fallback for missing or non-string values", () => {
    expect(frontmatterString({}, "name", "slug")).toBe("slug");
    expect(frontmatterString({ name: 42 }, "name", "slug")).toBe("slug");
    expect(frontmatterString({}, "name")).toBe("");
  });
});

describe("stringifyFrontmatter", () => {
  it("round-trips through parseFrontmatter", () => {
    const out = stringifyFrontmatter({ name: "x", type: "reference" }, "Hello");
    const { data, body } = parseFrontmatter(out);
    expect(data).toEqual({ name: "x", type: "reference" });
    expect(body).toBe("Hello");
  });
});
