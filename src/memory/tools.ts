import { defineTool } from "@github/copilot-sdk";
import type { Tool } from "@github/copilot-sdk";
import {
  writeMemory,
  readMemory,
  searchMemories,
  type MemoryType,
} from "./store.js";

interface RememberArgs {
  name: string;
  content: string;
  description?: string;
  type?: MemoryType;
}

const rememberParams: Record<string, unknown> = {
  type: "object",
  properties: {
    name: { type: "string", description: "Short title for the memory." },
    content: { type: "string", description: "The fact to remember." },
    description: { type: "string", description: "One-line summary used for recall." },
    type: {
      type: "string",
      enum: ["user", "feedback", "project", "reference"],
      description: "Kind of memory.",
    },
  },
  required: ["name", "content"],
};

const recallParams: Record<string, unknown> = {
  type: "object",
  properties: {
    query: { type: "string", description: "Text to search across stored memories." },
  },
  required: ["query"],
};

/** Tool to persist a durable memory to the memory directory. */
export function createRememberTool(dir: string): Tool<RememberArgs> {
  return defineTool<RememberArgs>("remember", {
    description:
      "Save a durable fact (user preference, project constraint, feedback) to memory so it " +
      "survives across sessions. Use sparingly for things worth remembering long-term.",
    parameters: rememberParams,
    handler: ({ name, content, description, type }) => {
      writeMemory(dir, { name, body: content, description, type });
      return { saved: name };
    },
  });
}

/** Tool to search stored memories and return their full content. */
export function createRecallTool(dir: string): Tool<{ query: string }> {
  return defineTool<{ query: string }>("recall", {
    description: "Search stored memories by keyword and return the matching entries in full.",
    parameters: recallParams,
    handler: ({ query }) => {
      const matches = searchMemories(dir, query).map((m) => ({
        name: m.name,
        description: m.description,
        body: readMemory(dir, m.name) ?? "",
      }));
      return { matches };
    },
  });
}
