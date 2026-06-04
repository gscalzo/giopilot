import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

export interface Frontmatter {
  /** Parsed YAML frontmatter (empty object when absent or invalid). */
  data: Record<string, unknown>;
  /** The document body with the frontmatter block and its trailing newlines removed. */
  body: string;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/;

function parseYamlSafe(text: string): Record<string, unknown> {
  try {
    const parsed = parseYaml(text);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Split a markdown document into its YAML frontmatter and body. */
export function parseFrontmatter(raw: string): Frontmatter {
  const match = FRONTMATTER_RE.exec(raw);
  if (!match) return { data: {}, body: raw };
  const body = raw.slice(match[0].length).replace(/^\n+/, "").replace(/\n+$/, "");
  return { data: parseYamlSafe(match[1] ?? ""), body };
}

/** Read a frontmatter field as a string, with a fallback when missing or non-string. */
export function frontmatterString(
  data: Record<string, unknown>,
  key: string,
  fallback = "",
): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

/** Render a markdown document with a YAML frontmatter block. */
export function stringifyFrontmatter(data: Record<string, unknown>, body: string): string {
  return `---\n${stringifyYaml(data).trimEnd()}\n---\n\n${body}\n`;
}
