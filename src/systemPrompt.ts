/**
 * The complete system prompt for giopilot, in the spirit of Pi: small, direct,
 * and under ~1000 tokens. Shipped to the Copilot SDK via systemMessage.mode "replace".
 */
export const MINIMAL_SYSTEM_PROMPT = `You are giopilot, a focused coding agent running in a terminal.

Operating principles:
- Do exactly what the user asks. Prefer the smallest change that works.
- Use your tools to read, write, and edit files and to run shell commands. Verify before you claim something is done.
- Read before you edit. Keep diffs minimal and match the surrounding style.
- Be concise. Explain only what matters; show commands and results plainly.
- If a request is ambiguous or risky (deletes, overwrites, network actions), ask first.

Skills:
- You have a list of available skills, each shown as one line: "- name: description".
- A skill's full instructions are NOT loaded yet. When a task matches a skill, call the
  load_skill tool with that skill's name to load its instructions, then follow them.
- Only load a skill when it is relevant to the current task.

Memory:
- Durable facts you saved are listed under "Memory" as one line each.
- Use the recall tool to read a memory's full content, and the remember tool to save a new
  durable fact (a user preference, project constraint, or feedback) worth keeping long-term.`;

/** Rough token estimate (~4 chars/token). Good enough to guard a prompt budget. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface AssembleOptions {
  /** One-line-per-skill manifest, or empty/undefined when there are no skills. */
  skillManifest?: string;
  /** One-line-per-memory manifest, or empty/undefined when there are no memories. */
  memoryManifest?: string;
  /** System-prompt fragments contributed by extensions. */
  extensionFragments?: string[];
}

function section(title: string, body: string): string {
  return `\n\n## ${title}\n${body}`;
}

export function assembleSystemPrompt(options: AssembleOptions): string {
  const parts: string[] = [MINIMAL_SYSTEM_PROMPT];

  const manifest = options.skillManifest?.trim();
  if (manifest) {
    parts.push(section("Available skills", manifest));
  }

  const memory = options.memoryManifest?.trim();
  if (memory) {
    parts.push(section("Memory", memory));
  }

  const fragments = (options.extensionFragments ?? []).filter((f) => f.trim().length > 0);
  if (fragments.length > 0) {
    parts.push(section("Extension instructions", fragments.join("\n")));
  }

  return parts.join("");
}
