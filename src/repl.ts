import { buildManifest } from "./skills/inject.js";
import type { Harness } from "./harness.js";

/** Outcome of handling one line: keep going, stop, or open the model picker. */
export type ReplResult = "continue" | "exit" | "model";

/** Output sink for the REPL (stdout in production, captured in tests). */
export interface ReplIO {
  print(text: string): void;
}

const HELP = `Commands:
  /skills            list available skills (one line each)
  /skill:<name>      load a skill's full instructions and act on it
  /model             switch the model
  /<command>         run an extension command
  /help              show this help
  /exit, /quit       leave giopilot
Anything else is sent to the agent as a prompt.`;

function printSkills(harness: Harness, io: ReplIO): void {
  io.print(harness.skills.length ? buildManifest(harness.skills) : "No skills configured.");
}

async function runSkill(name: string, harness: Harness, io: ReplIO): Promise<void> {
  const body = harness.loadSkillBody(name);
  if (!body) {
    io.print(`Skill not found: ${name}`);
    return;
  }
  await harness.sendTurn(`Load and follow the "${name}" skill:\n\n${body}`);
}

async function runExtensionCommand(
  name: string,
  args: string,
  harness: Harness,
  io: ReplIO,
): Promise<void> {
  const command = harness.commands.get(name);
  if (!command) {
    io.print(`Unknown command: /${name}`);
    return;
  }
  await command.handler(args, { args, print: io.print });
}

type Builtin = (harness: Harness, io: ReplIO) => ReplResult;

const BUILTINS: Record<string, Builtin> = {
  exit: () => "exit",
  quit: () => "exit",
  model: () => "model",
  help: (_harness, io) => {
    io.print(HELP);
    return "continue";
  },
  skills: (harness, io) => {
    printSkills(harness, io);
    return "continue";
  },
};

/** The built-in slash-command names (without leading slash) — the single source for autocomplete. */
export const BUILTIN_NAMES = Object.keys(BUILTINS);

async function dispatchCommand(body: string, harness: Harness, io: ReplIO): Promise<ReplResult> {
  const [head = "", ...rest] = body.split(/\s+/);

  const builtin = BUILTINS[head];
  if (builtin) return builtin(harness, io);

  if (head.startsWith("skill:")) {
    await runSkill(head.slice("skill:".length), harness, io);
    return "continue";
  }
  await runExtensionCommand(head, rest.join(" "), harness, io);
  return "continue";
}

/** Handle one line of REPL input. Slash commands are dispatched; everything else is a prompt. */
export async function handleInput(
  line: string,
  harness: Harness,
  io: ReplIO,
): Promise<ReplResult> {
  const trimmed = line.trim();
  if (trimmed.length === 0) return "continue";
  if (trimmed.startsWith("/")) return dispatchCommand(trimmed.slice(1), harness, io);
  await harness.sendTurn(trimmed);
  return "continue";
}
