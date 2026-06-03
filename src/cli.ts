#!/usr/bin/env node
import { stdout } from "node:process";
import { loadConfig } from "./config.js";
import { createHarness } from "./harness.js";
import { runRepl, type ReplIO } from "./repl.js";

const io: ReplIO = { print: (text) => stdout.write(text + "\n") };

function streamingRender() {
  return {
    onDelta: (text: string) => stdout.write(text),
    onToolStart: (name: string) => stdout.write(`\n\x1b[2m[tool: ${name}]\x1b[0m\n`),
    onIdle: () => stdout.write("\n"),
  };
}

async function main(): Promise<void> {
  const config = loadConfig();
  const harness = await createHarness(config, { render: streamingRender() });

  const failed = harness.extensionResults.filter((r) => !r.ok);
  for (const f of failed) io.print(`\x1b[31m[extension failed] ${f.path}: ${f.error}\x1b[0m`);

  const task = process.argv.slice(2).join(" ").trim();
  if (task.length > 0) {
    await harness.sendTurn(task);
    await harness.stop();
    return;
  }

  await runRepl(harness, io);
  await harness.stop();
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`giopilot error: ${message}\n`);
  process.exitCode = 1;
});
