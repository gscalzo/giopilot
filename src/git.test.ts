import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gitBranch } from "./git.js";

let root: string;

function initRepo(headContent: string): string {
  const repo = join(root, "repo");
  mkdirSync(join(repo, ".git"), { recursive: true });
  writeFileSync(join(repo, ".git", "HEAD"), headContent);
  return repo;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "giopilot-git-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("gitBranch", () => {
  it("returns the branch name from .git/HEAD", () => {
    const repo = initRepo("ref: refs/heads/main\n");
    expect(gitBranch(repo)).toBe("main");
  });

  it("handles branch names containing slashes", () => {
    const repo = initRepo("ref: refs/heads/feature/status-line\n");
    expect(gitBranch(repo)).toBe("feature/status-line");
  });

  it("returns a short sha for a detached HEAD", () => {
    const repo = initRepo("0123456789abcdef0123456789abcdef01234567\n");
    expect(gitBranch(repo)).toBe("0123456");
  });

  it("walks up parent directories to find the repo", () => {
    const repo = initRepo("ref: refs/heads/main\n");
    const nested = join(repo, "src", "deep");
    mkdirSync(nested, { recursive: true });
    expect(gitBranch(nested)).toBe("main");
  });

  it("returns null when there is no git repo", () => {
    expect(gitBranch(root)).toBeNull();
  });
});
