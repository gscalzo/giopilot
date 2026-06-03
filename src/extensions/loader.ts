import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { HarnessAPI } from "./api.js";

/** Outcome of attempting to load one extension file. */
export interface ExtensionLoadResult {
  path: string;
  ok: boolean;
  error?: string;
}

const EXTENSION_FILE_RE = /\.(ts|mjs|js)$/;

async function loadOne(full: string, api: HarnessAPI): Promise<ExtensionLoadResult> {
  try {
    const mod = (await import(pathToFileURL(full).href)) as { default?: unknown };
    const fn = mod.default;
    if (typeof fn !== "function") {
      return { path: full, ok: false, error: "default export is not a function" };
    }
    await (fn as (api: HarnessAPI) => unknown | Promise<unknown>)(api);
    return { path: full, ok: true };
  } catch (err) {
    return { path: full, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Discover and load extension modules from the given directories (global then
 * project). Each module's default export is called with the HarnessAPI so it can
 * register tools, commands, and system-prompt fragments. Failures are reported,
 * never thrown, so one bad extension can't take down the harness.
 */
export async function loadExtensions(
  dirs: string[],
  api: HarnessAPI,
): Promise<ExtensionLoadResult[]> {
  const results: ExtensionLoadResult[] = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !EXTENSION_FILE_RE.test(entry.name)) continue;
      results.push(await loadOne(join(dir, entry.name), api));
    }
  }
  return results;
}
