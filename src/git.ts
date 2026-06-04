import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

/** Walk up from `start` to find the nearest `.git`, returning its path or null. */
function findGitPath(start: string): string | null {
  let dir = start;
  for (;;) {
    const candidate = join(dir, ".git");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** Resolve the HEAD file, supporting `.git` as a directory or a worktree pointer file. */
function headFile(gitPath: string): string | null {
  if (statSync(gitPath).isDirectory()) return join(gitPath, "HEAD");
  const pointer = /^gitdir:\s*(.+)$/m.exec(readFileSync(gitPath, "utf8"));
  return pointer ? join(pointer[1]!.trim(), "HEAD") : null;
}

function branchFromHead(head: string): string {
  const ref = /^ref:\s*refs\/heads\/(.+)$/.exec(head);
  return ref ? ref[1]! : head.slice(0, 7);
}

/** Current branch name (or short sha when detached) for the repo containing `cwd`. */
export function gitBranch(cwd: string): string | null {
  const gitPath = findGitPath(cwd);
  if (!gitPath) return null;
  const file = headFile(gitPath);
  if (!file || !existsSync(file)) return null;
  return branchFromHead(readFileSync(file, "utf8").trim());
}
