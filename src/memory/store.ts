import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter, frontmatterString, stringifyFrontmatter } from "../frontmatter.js";
import { manifestLines } from "../manifest.js";

export type MemoryType = "user" | "feedback" | "project" | "reference";

/** A memory to persist. */
export interface MemoryInput {
  name: string;
  description?: string;
  type?: MemoryType;
  body: string;
}

/** Metadata for a stored memory. */
export interface MemoryMeta {
  name: string;
  description: string;
  type: string;
  slug: string;
}

const INDEX_FILE = "MEMORY.md";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function memoryFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".md") && f !== INDEX_FILE);
}

/** Parse one memory file once, returning both its metadata and body. */
function parseMemory(dir: string, file: string): { meta: MemoryMeta; body: string } {
  const { data, body } = parseFrontmatter(readFileSync(join(dir, file), "utf8"));
  const slug = file.replace(/\.md$/, "");
  const meta: MemoryMeta = {
    name: frontmatterString(data, "name", slug),
    description: frontmatterString(data, "description"),
    type: frontmatterString(data, "type", "reference"),
    slug,
  };
  return { meta, body };
}

export function listMemories(dir: string): MemoryMeta[] {
  return memoryFiles(dir).map((f) => parseMemory(dir, f).meta);
}

function writeIndex(dir: string): void {
  const content = `# Memory\n\n${manifestLines(listMemories(dir))}\n`;
  writeFileSync(join(dir, INDEX_FILE), content);
}

export function writeMemory(dir: string, input: MemoryInput): string {
  mkdirSync(dir, { recursive: true });
  const slug = slugify(input.name);
  const path = join(dir, `${slug}.md`);
  const data = {
    name: input.name,
    description: input.description ?? "",
    type: input.type ?? "reference",
  };
  writeFileSync(path, stringifyFrontmatter(data, input.body));
  writeIndex(dir);
  return path;
}

export function readIndex(dir: string): string {
  const file = join(dir, INDEX_FILE);
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

export function readMemory(dir: string, name: string): string | null {
  const slug = slugify(name);
  const file = join(dir, `${slug}.md`);
  if (!existsSync(file)) return null;
  return parseFrontmatter(readFileSync(file, "utf8")).body;
}

export function searchMemories(dir: string, query: string): MemoryMeta[] {
  const needle = query.toLowerCase();
  return memoryFiles(dir)
    .map((f) => parseMemory(dir, f))
    .filter(({ meta, body }) =>
      `${meta.name} ${meta.description} ${body}`.toLowerCase().includes(needle),
    )
    .map(({ meta }) => meta);
}
