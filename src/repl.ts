import { createInterface } from "node:readline";
import { buildManifest } from "./skills/inject.js";
import type { Harness } from "./harness.js";

/** Whether the REPL should keep going or stop. */
export type ReplResult = "continue" | "exit";

/** Output sink for the REPL (stdout in production, captured in tests). */
export interface ReplIO {
  print(text: string): void;
}

const HELP = `Commands:
  /skills            list available skills (one line each)
  /skill:<name>      load a skill's full instructions and act on it
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

async function dispatchCommand(body: string, harness: Harness, io: ReplIO): Promise<ReplResult> {
  const [head = "", ...rest] = body.split(/\s+/);
  const args = rest.join(" ");

  if (head === "exit" || head === "quit") return "exit";
  if (head === "help") {
    io.print(HELP);
    return "continue";
  }
  if (head === "skills") {
    printSkills(harness, io);
    return "continue";
  }
  if (head.startsWith("skill:")) {
    await runSkill(head.slice("skill:".length), harness, io);
    return "continue";
  }
  await runExtensionCommand(head, args, harness, io);
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

/** Run the interactive readline loop until the user exits. */
export async function runRepl(harness: Harness, io: ReplIO): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  io.print('giopilot ready. Type /help for commands, /exit to quit.');
  const prompt = () => {
    rl.setPrompt("› ");
    rl.prompt();
  };
  prompt();
  for await (const line of rl) {
    const result = await handleInput(line, harness, io);
    if (result === "exit") break;
    prompt();
  }
  rl.close();
}
