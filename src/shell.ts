import { exec, type ExecException } from "node:child_process";

/** Combine a command's streams and tack on a note when it exited non-zero. */
function formatShellOutput(stdout: string, stderr: string, error: ExecException | null): string {
  const body = `${stdout}${stderr}`.trimEnd();
  const code = error?.code;
  if (typeof code === "number" && code !== 0) {
    return body.length > 0 ? `${body}\n[exit ${code}]` : `[exit ${code}]`;
  }
  return body;
}

/**
 * Run a command in the user's shell, resolving with combined stdout + stderr.
 * Output is for display only — it never enters the agent's context.
 */
export function runShell(command: string): Promise<string> {
  return new Promise((resolve) => {
    exec(command, { encoding: "utf8" }, (error, stdout, stderr) => {
      resolve(formatShellOutput(stdout, stderr, error));
    });
  });
}
