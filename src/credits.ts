/** A parsed Copilot quota snapshot. */
export interface CreditsInfo {
  quotaId: string;
  remaining: number;
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
  remaining?: unknown;
  entitlement?: unknown;
  unlimited?: unknown;
}

function toInfo(quotaId: string, snap: RawSnapshot): CreditsInfo {
  return {
    quotaId,
    remaining: Number(snap.remaining ?? 0),
    entitlement: Number(snap.entitlement ?? 0),
    unlimited: Boolean(snap.unlimited),
  };
}

function isEntitled(snap: RawSnapshot): boolean {
  return Number(snap.entitlement ?? 0) > 0 || Boolean(snap.unlimited);
}

/** Pick premium_interactions when it is entitled, otherwise fall back to chat. */
export function parseCredits(body: unknown): CreditsInfo | null {
  const snapshots = (body as { quota_snapshots?: Record<string, RawSnapshot> }).quota_snapshots;
  if (!snapshots) return null;

  const premium = snapshots.premium_interactions;
  if (premium && isEntitled(premium)) return toInfo("premium", premium);
  return snapshots.chat ? toInfo("chat", snapshots.chat) : null;
}

/** Render credits compactly, e.g. "194/200 (97%)" or "∞" (matching VS Code's hover). */
export function formatCredits(info: CreditsInfo): string {
  if (info.unlimited) return "∞";
  const pct = info.entitlement > 0 ? Math.round((info.remaining / info.entitlement) * 100) : 0;
  return `${info.remaining}/${info.entitlement} (${pct}%)`;
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
