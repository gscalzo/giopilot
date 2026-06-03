#!/usr/bin/env node
import { argv, stderr, stdout } from "node:process";
import { loadConfig } from "./config.js";
import { createHarness, type Harness, type RenderHooks } from "./harness.js";
import { parseModelFlag } from "./models.js";
import { SessionController } from "./ui/controller.js";
import { runTui } from "./ui/App.js";

function oneShotRender(): RenderHooks {
  return {
    onDelta: (text) => stdout.write(text),
    onToolStart: (name) => stdout.write(`\n\x1b[2m[tool: ${name}]\x1b[0m\n`),
    onIdle: () => stdout.write("\n"),
  };
}

function reportFailedExtensions(harness: Harness, note: (text: string) => void): void {
  for (const r of harness.extensionResults.filter((x) => !x.ok)) {
    note(`[extension failed] ${r.path}: ${r.error}`);
  }
}

async function runOneShot(config: ReturnType<typeof loadConfig>, task: string): Promise<void> {
  const harness = await createHarness(config, { render: oneShotRender() });
  reportFailedExtensions(harness, (t) => stderr.write(`\x1b[31m${t}\x1b[0m\n`));
  await harness.sendTurn(task);
  await harness.stop();
}

async function runInteractive(config: ReturnType<typeof loadConfig>): Promise<void> {
  const controller = new SessionController();
  const harness = await createHarness(config, { render: controller.renderHooks() });
  controller.attach(harness);
  reportFailedExtensions(harness, (t) => controller.note(t));
  await runTui(controller);
  await harness.stop();
}

async function main(): Promise<void> {
  const { model, rest } = parseModelFlag(argv.slice(2));
  const config = loadConfig();
  if (model) config.settings.model = model;

  const task = rest.join(" ").trim();
  if (task.length > 0) {
    await runOneShot(config, task);
    return;
  }
  await runInteractive(config);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  stderr.write(`giopilot error: ${message}\n`);
  process.exitCode = 1;
});
