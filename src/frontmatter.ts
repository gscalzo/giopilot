import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export interface Frontmatter {
  /** Parsed YAML frontmatter (empty object when absent or invalid). */
  data: Record<string, unknown>;
  /** The document body with the frontmatter block and its trailing newlines removed. */
  body: string;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

/** Split a markdown document into its YAML frontmatter and body. */
export function parseFrontmatter(raw: string): Frontmatter {
  const match = FRONTMATTER_RE.exec(raw);
  if (!match) return { data: {}, body: raw };

  let data: Record<string, unknown> = {};
  try {
    const parsed = parseYaml(match[1] ?? "");
    if (parsed && typeof parsed === "object") data = parsed as Record<string, unknown>;
  } catch {
    data = {};
  }
  const body = raw.slice(match[0].length).replace(/^\n+/, "").replace(/\n+$/, "");
  return { data, body };
}

/** Render a markdown document with a YAML frontmatter block. */
export function stringifyFrontmatter(data: Record<string, unknown>, body: string): string {
  return `---\n${stringifyYaml(data).trimEnd()}\n---\n\n${body}\n`;
}
