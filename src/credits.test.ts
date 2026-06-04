import { describe, it, expect, vi } from "vitest";
import { parseCredits, formatCredits, fetchCredits } from "./credits.js";

function snapshot(entitlement: number, percentRemaining: number, unlimited = false) {
  return { entitlement, percent_remaining: percentRemaining, unlimited };
}

describe("parseCredits", () => {
  it("prefers premium_interactions and computes used like VS Code", () => {
    // 6800 * (1 - 53.1/100) = 3189.2 — matches the VS Code hover.
    const body = {
      quota_snapshots: {
        chat: snapshot(200, 97),
        premium_interactions: snapshot(6800, 53.1),
      },
    };
    const info = parseCredits(body)!;
    expect(info.quotaId).toBe("premium");
    expect(info.entitlement).toBe(6800);
    expect(info.used).toBeCloseTo(3189.2, 1);
  });

  it("falls back to chat when premium has no entitlement", () => {
    const body = {
      quota_snapshots: {
        chat: snapshot(200, 97),
        premium_interactions: snapshot(0, 0),
      },
    };
    const info = parseCredits(body)!;
    expect(info.quotaId).toBe("chat");
    expect(info.entitlement).toBe(200);
    expect(info.used).toBeCloseTo(6, 1); // 200 * (1 - 97/100)
  });

  it("marks entitlement -1 as unlimited", () => {
    const body = { quota_snapshots: { premium_interactions: snapshot(-1, 100) } };
    expect(parseCredits(body)).toMatchObject({ quotaId: "premium", unlimited: true });
  });

  it("returns null when there are no usable snapshots", () => {
    expect(parseCredits({})).toBeNull();
    expect(parseCredits({ quota_snapshots: {} })).toBeNull();
  });
});

describe("formatCredits", () => {
  it("renders used / total with separators, like the VS Code hover", () => {
    expect(formatCredits({ quotaId: "premium", used: 3189.2, entitlement: 6800, unlimited: false })).toBe(
      "3,189.2 / 6,800 used",
    );
  });

  it("renders unlimited as an infinity sign", () => {
    expect(formatCredits({ quotaId: "premium", used: 0, entitlement: -1, unlimited: true })).toBe("∞");
  });
});

describe("fetchCredits", () => {
  const okBody = { quota_snapshots: { chat: snapshot(200, 97) } };

  it("returns parsed credits on success with Bearer auth", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => okBody }));
    const info = await fetchCredits("tok", fetchImpl);
    expect(info).toMatchObject({ quotaId: "chat", entitlement: 200 });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.github.com/copilot_internal/user",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer tok" }) }),
    );
  });

  it("returns null on a non-ok response", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, json: async () => ({}) }));
    expect(await fetchCredits("tok", fetchImpl)).toBeNull();
  });

  it("returns null when the request throws", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(await fetchCredits("tok", fetchImpl)).toBeNull();
  });

  it("returns null without a token", async () => {
    const fetchImpl = vi.fn();
    expect(await fetchCredits(null, fetchImpl)).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
