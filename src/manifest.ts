/** A thing that can be rendered as one manifest line. */
export interface Named {
  name: string;
  description: string;
}

/** Render one "- name: description" manifest line (LLM-facing). */
export function manifestLine(name: string, description: string): string {
  return `- ${name}: ${description || "(no description)"}`;
}

/** Render one manifest line per item, newline-separated. */
export function manifestLines(items: Named[]): string {
  return items.map((i) => manifestLine(i.name, i.description)).join("\n");
}
