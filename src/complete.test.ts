import { describe, it, expect } from "vitest";
import { completeCommand } from "./complete.js";

const NAMES = ["exit", "help", "model", "ping", "quit", "skill:git-commit", "skills"];

describe("completeCommand", () => {
  it("returns nothing for non-slash input", () => {
    expect(completeCommand("hello world", NAMES)).toEqual({ matches: [], completed: "hello world" });
  });

  it("lists every command for a bare slash", () => {
    const { matches } = completeCommand("/", NAMES);
    expect(matches).toEqual([
      "/exit",
      "/help",
      "/model",
      "/ping",
      "/quit",
      "/skill:git-commit",
      "/skills",
    ]);
  });

  it("completes to the longest common prefix of the matches", () => {
    // "skills" and "skill:git-commit" share "skill"
    const { matches, completed } = completeCommand("/sk", NAMES);
    expect(matches).toEqual(["/skill:git-commit", "/skills"]);
    expect(completed).toBe("/skill");
  });

  it("completes a unique prefix fully", () => {
    expect(completeCommand("/h", NAMES)).toEqual({ matches: ["/help"], completed: "/help" });
  });

  it("leaves an already-complete command unchanged", () => {
    expect(completeCommand("/model", NAMES)).toEqual({ matches: ["/model"], completed: "/model" });
  });

  it("completes skill names after the colon", () => {
    expect(completeCommand("/skill:", NAMES)).toEqual({
      matches: ["/skill:git-commit"],
      completed: "/skill:git-commit",
    });
  });

  it("returns no suggestions for an unknown command", () => {
    expect(completeCommand("/zzz", NAMES)).toEqual({ matches: [], completed: "/zzz" });
  });

  it("stops suggesting once the command has arguments", () => {
    expect(completeCommand("/skill:git-commit now", NAMES)).toEqual({
      matches: [],
      completed: "/skill:git-commit now",
    });
  });
});
