import { describe, it, expect } from "vitest";
import { runShell } from "./shell.js";

describe("runShell", () => {
  it("returns the stdout of a successful command", async () => {
    expect(await runShell("echo hello")).toBe("hello");
  });

  it("captures stderr", async () => {
    expect(await runShell("echo oops 1>&2")).toContain("oops");
  });

  it("returns an empty string for a silent successful command", async () => {
    expect(await runShell("true")).toBe("");
  });

  it("appends an exit-code note when a command fails with no output", async () => {
    expect(await runShell("exit 3")).toBe("[exit 3]");
  });

  it("keeps the output and appends the exit-code note when a command fails noisily", async () => {
    const out = await runShell("echo out; exit 5");
    expect(out).toContain("out");
    expect(out).toContain("[exit 5]");
  });
});
