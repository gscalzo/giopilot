import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter, stringifyFrontmatter } from "../frontmatter.js";

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

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function memoryFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".md") && f !== INDEX_FILE);
}

function metaOf(dir: string, file: string): MemoryMeta {
  const { data } = parseFrontmatter(readFileSync(join(dir, file), "utf8"));
  const slug = file.replace(/\.md$/, "");
  return {
    name: str(data.name, slug),
    description: str(data.description),
    type: str(data.type, "reference"),
    slug,
  };
}

export function listMemories(dir: string): MemoryMeta[] {
  return memoryFiles(dir).map((f) => metaOf(dir, f));
}

function writeIndex(dir: string): void {
  const lines = listMemories(dir).map((m) => `- ${m.name}: ${m.description || "(no description)"}`);
  const content = `# Memory\n\n${lines.join("\n")}\n`;
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
    .map((f) => ({ meta: metaOf(dir, f), body: parseFrontmatter(readFileSync(join(dir, f), "utf8")).body }))
    .filter(({ meta, body }) =>
      `${meta.name} ${meta.description} ${body}`.toLowerCase().includes(needle),
    )
    .map(({ meta }) => meta);
}
