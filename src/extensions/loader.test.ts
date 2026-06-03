import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createExtensionRegistry } from "./api.js";
import { loadExtensions } from "./loader.js";

let root: string;
let extDir: string;

function writeExt(name: string, source: string) {
  writeFileSync(join(extDir, name), source);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "giopilot-ext-"));
  extDir = join(root, "extensions");
  mkdirSync(extDir, { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("loadExtensions", () => {
  it("returns nothing when no extension dirs exist", async () => {
    const reg = createExtensionRegistry({ model: "gpt-5" });
    const results = await loadExtensions([join(root, "missing")], reg.api);
    expect(results).toEqual([]);
  });

  it("invokes the default export with the API", async () => {
    writeExt(
      "hello.mjs",
      `export default function (gio) {
         gio.registerCommand("ping", (args, ctx) => ctx.print("pong"));
         gio.addSystemPrompt("Prefer conventional commits.");
         gio.registerTool({ name: "deploy" });
       }`,
    );
    const reg = createExtensionRegistry({ model: "gpt-5" });
    const results = await loadExtensions([extDir], reg.api);

    expect(results).toHaveLength(1);
    expect(results[0]?.ok).toBe(true);
    expect(reg.commands.has("ping")).toBe(true);
    expect(reg.fragments).toContain("Prefer conventional commits.");
    expect(reg.tools.map((t) => (t as { name: string }).name)).toContain("deploy");
  });

  it("awaits async default exports", async () => {
    writeExt(
      "async.mjs",
      `export default async function (gio) {
         await Promise.resolve();
         gio.addSystemPrompt("loaded async");
       }`,
    );
    const reg = createExtensionRegistry({ model: "gpt-5" });
    const results = await loadExtensions([extDir], reg.api);
    expect(results[0]?.ok).toBe(true);
    expect(reg.fragments).toContain("loaded async");
  });

  it("reports a file whose default export is not a function", async () => {
    writeExt("bad.mjs", `export default 42;`);
    const reg = createExtensionRegistry({ model: "gpt-5" });
    const results = await loadExtensions([extDir], reg.api);
    expect(results[0]?.ok).toBe(false);
    expect(results[0]?.error).toMatch(/not a function/i);
  });

  it("captures errors thrown by an extension without crashing", async () => {
    writeExt("throws.mjs", `export default function () { throw new Error("boom"); }`);
    const reg = createExtensionRegistry({ model: "gpt-5" });
    const results = await loadExtensions([extDir], reg.api);
    expect(results[0]?.ok).toBe(false);
    expect(results[0]?.error).toContain("boom");
  });

  it("ignores non-extension files", async () => {
    writeExt("notes.txt", "not an extension");
    const reg = createExtensionRegistry({ model: "gpt-5" });
    const results = await loadExtensions([extDir], reg.api);
    expect(results).toEqual([]);
  });
});
