export type UpdateSource = "npm" | "github" | "none";

export interface UpdateInfo {
  current: string;
  latest: string | null;
  updateAvailable: boolean;
  source: UpdateSource;
}

/** Minimal fetch surface so tests can inject a fake. */
export type FetchLike = (url: string) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

export interface CheckOptions {
  fetchImpl?: FetchLike;
  /** npm package name to query. */
  pkg?: string;
  /** GitHub repo (owner/name) for the releases fallback. */
  repo?: string;
}

const DEFAULT_PKG = "giopilot";
const DEFAULT_REPO = "gscalzo/giopilot";

function parseVersion(v: string): number[] {
  return v
    .replace(/^v/, "")
    .split(/[.+-]/)
    .map((n) => Number.parseInt(n, 10))
    .map((n) => (Number.isNaN(n) ? 0 : n));
}

/** True when `candidate` is a strictly newer version than `current`. */
export function isNewer(candidate: string, current: string): boolean {
  const a = parseVersion(candidate);
  const b = parseVersion(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

async function readJson(fetchImpl: FetchLike, url: string): Promise<unknown | null> {
  try {
    const res = await fetchImpl(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function latestFromNpm(fetchImpl: FetchLike, pkg: string): Promise<string | null> {
  const body = await readJson(fetchImpl, `https://registry.npmjs.org/${pkg}`);
  const latest = (body as { "dist-tags"?: { latest?: unknown } } | null)?.["dist-tags"]?.latest;
  return typeof latest === "string" ? latest : null;
}

async function latestFromGitHub(fetchImpl: FetchLike, repo: string): Promise<string | null> {
  const body = await readJson(fetchImpl, `https://api.github.com/repos/${repo}/releases/latest`);
  const tag = (body as { tag_name?: unknown } | null)?.tag_name;
  return typeof tag === "string" ? tag.replace(/^v/, "") : null;
}

/** Check npm (then GitHub releases) for a newer published version. */
export async function checkForUpdate(current: string, options: CheckOptions = {}): Promise<UpdateInfo> {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  const sources: [Exclude<UpdateSource, "none">, () => Promise<string | null>][] = [
    ["npm", () => latestFromNpm(fetchImpl, options.pkg ?? DEFAULT_PKG)],
    ["github", () => latestFromGitHub(fetchImpl, options.repo ?? DEFAULT_REPO)],
  ];

  for (const [source, fetchLatest] of sources) {
    const latest = await fetchLatest();
    if (latest) return { current, latest, updateAvailable: isNewer(latest, current), source };
  }
  return { current, latest: null, updateAvailable: false, source: "none" };
}
