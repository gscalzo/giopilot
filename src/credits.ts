/** A parsed Copilot quota snapshot, shaped like the VS Code extension's "Credits". */
export interface CreditsInfo {
  quotaId: string;
  /** Amount used: entitlement * (1 - percentRemaining/100), as VS Code computes it. */
  used: number;
  /** Total entitlement for the period. */
  entitlement: number;
  unlimited: boolean;
}

/** Minimal fetch surface (with headers) so tests can inject a fake. */
export type FetchLike = (
  url: string,
  init: { headers: Record<string, string> },
) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

const ENDPOINT = "https://api.github.com/copilot_internal/user";

interface RawSnapshot {
  entitlement?: unknown;
  percent_remaining?: unknown;
  unlimited?: unknown;
}

// Mirrors vscode-copilot-chat: used = entitlement * (1 - percentRemaining/100).
function toInfo(quotaId: string, snap: RawSnapshot): CreditsInfo {
  const entitlement = Number(snap.entitlement ?? 0);
  const percentRemaining = Number(snap.percent_remaining ?? 0);
  const used = Math.max(0, entitlement * (1 - percentRemaining / 100));
  return { quotaId, used, entitlement, unlimited: Boolean(snap.unlimited) || entitlement === -1 };
}

function isEntitled(snap: RawSnapshot): boolean {
  const entitlement = Number(snap.entitlement ?? 0);
  return entitlement > 0 || entitlement === -1 || Boolean(snap.unlimited);
}

/** Pick premium_interactions (the "Credits") when entitled, otherwise fall back to chat. */
export function parseCredits(body: unknown): CreditsInfo | null {
  const snapshots = (body as { quota_snapshots?: Record<string, RawSnapshot> }).quota_snapshots;
  if (!snapshots) return null;

  const premium = snapshots.premium_interactions;
  if (premium && isEntitled(premium)) return toInfo("premium", premium);
  return snapshots.chat ? toInfo("chat", snapshots.chat) : null;
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

/** Render credits as VS Code does on hover, e.g. "3,189.2 / 6,800 used" or "∞". */
export function formatCredits(info: CreditsInfo): string {
  if (info.unlimited) return "∞";
  return `${fmt(info.used)} / ${fmt(info.entitlement)} used`;
}

/** Best-effort fetch of Copilot quota from GitHub's internal endpoint. Null on any failure. */
export async function fetchCredits(
  token: string | null,
  fetchImpl: FetchLike = globalThis.fetch as unknown as FetchLike,
): Promise<CreditsInfo | null> {
  if (!token) return null;
  try {
    const res = await fetchImpl(ENDPOINT, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "User-Agent": "giopilot",
      },
    });
    if (!res.ok) return null;
    return parseCredits(await res.json());
  } catch {
    return null;
  }
}
