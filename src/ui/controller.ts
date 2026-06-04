import type { Harness } from "../harness.js";
import { handleInput, BUILTIN_NAMES, type ReplIO, type ReplResult } from "../repl.js";
import { toModelChoices, type ModelChoice } from "../models.js";

export type Status = "idle" | "thinking";
export type LineRole = "user" | "assistant" | "tool" | "system";

export interface TranscriptLine {
  role: LineRole;
  text: string;
}

export interface ControllerState {
  lines: TranscriptLine[];
  status: Status;
  model: string;
  pickerOpen: boolean;
  models: ModelChoice[];
  branch: string | null;
  credits: string | null;
}

const INITIAL_STATE: ControllerState = {
  lines: [],
  status: "idle",
  model: "",
  pickerOpen: false,
  models: [],
  branch: null,
  credits: null,
};

/**
 * Holds all interactive-session state and behaviour, independent of any UI
 * framework. The Ink view subscribes to it and renders state; it never owns logic.
 */
export class SessionController {
  state: ControllerState = INITIAL_STATE;
  onExit: () => void = () => {};

  private harness: Harness | null = null;
  private readonly listeners = new Set<() => void>();

  /** Render hooks to hand to createHarness so streaming flows into the transcript. */
  renderHooks() {
    return {
      onDelta: (text: string) => this.appendAssistant(text),
      onToolStart: (name: string) => this.addLine("tool", `[tool: ${name}]`),
      onIdle: () => this.update({ status: "idle" }),
    };
  }

  attach(harness: Harness): void {
    this.harness = harness;
    this.update({ model: harness.model });
  }

  /** Add a system note to the transcript (e.g. startup warnings). */
  note(text: string): void {
    this.addLine("system", text);
  }

  /** Set the git branch shown in the status line. */
  setBranch(branch: string | null): void {
    this.update({ branch });
  }

  /** Set the Copilot credits string shown in the status line. */
  setCredits(credits: string | null): void {
    this.update({ credits });
  }

  /** All command tokens (no leading slash) for autocomplete: builtins, skills, extensions. */
  commandNames(): string[] {
    const names = [...BUILTIN_NAMES];
    if (this.harness) {
      for (const skill of this.harness.skills) names.push(`skill:${skill.name}`);
      names.push(...this.harness.commands.keys());
    }
    return names.sort();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private get io(): ReplIO {
    return { print: (text) => this.addLine("system", text) };
  }

  private update(patch: Partial<ControllerState>): void {
    this.state = { ...this.state, ...patch };
    for (const fn of this.listeners) fn();
  }

  private addLine(role: LineRole, text: string): void {
    this.update({ lines: [...this.state.lines, { role, text }] });
  }

  private appendAssistant(text: string): void {
    const { lines } = this.state;
    const last = lines[lines.length - 1];
    if (last && last.role === "assistant") {
      const merged = { role: "assistant" as const, text: last.text + text };
      this.update({ lines: [...lines.slice(0, -1), merged] });
      return;
    }
    this.addLine("assistant", text);
  }

  private async applyResult(result: ReplResult): Promise<void> {
    if (result === "exit") return this.onExit();
    if (result === "model") return this.openModelPicker();
    this.update({ status: "idle" });
  }

  async submit(input: string): Promise<void> {
    const trimmed = input.trim();
    if (trimmed.length === 0 || !this.harness) return;
    if (!trimmed.startsWith("/")) this.addLine("user", trimmed);

    this.update({ status: "thinking" });
    await this.applyResult(await handleInput(trimmed, this.harness, this.io));
  }

  async openModelPicker(): Promise<void> {
    if (!this.harness) return;
    const models = await this.harness.listModels();
    this.update({ models: toModelChoices(models), pickerOpen: true, status: "idle" });
  }

  async chooseModel(id: string): Promise<void> {
    if (!this.harness) return;
    await this.harness.setModel(id);
    this.update({
      model: id,
      pickerOpen: false,
      lines: [...this.state.lines, { role: "system", text: `Model switched to ${id}` }],
    });
  }

  cancelModelPicker(): void {
    this.update({ pickerOpen: false });
  }
}
