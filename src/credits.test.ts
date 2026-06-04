import { describe, it, expect, vi } from "vitest";
import { parseCredits, formatCredits, fetchCredits } from "./credits.js";

function snapshot(remaining: number, entitlement: number, unlimited = false) {
  return { remaining, entitlement, unlimited };
}

describe("parseCredits", () => {
  it("prefers premium_interactions when it has an entitlement", () => {
    const body = {
      quota_snapshots: {
        chat: snapshot(194, 200),
        premium_interactions: snapshot(30, 300),
      },
    };
    expect(parseCredits(body)).toEqual({ quotaId: "premium", remaining: 30, entitlement: 300, unlimited: false });
  });

  it("falls back to chat when premium has no entitlement", () => {
    const body = {
      quota_snapshots: {
        chat: snapshot(194, 200),
        premium_interactions: snapshot(0, 0),
      },
    };
    expect(parseCredits(body)).toEqual({ quotaId: "chat", remaining: 194, entitlement: 200, unlimited: false });
  });

  it("returns null when there are no usable snapshots", () => {
    expect(parseCredits({})).toBeNull();
    expect(parseCredits({ quota_snapshots: {} })).toBeNull();
  });
});

describe("formatCredits", () => {
  it("renders remaining/entitlement with a percentage", () => {
    expect(formatCredits({ quotaId: "chat", remaining: 194, entitlement: 200, unlimited: false })).toBe("194/200 (97%)");
  });

  it("renders unlimited as an infinity sign", () => {
    expect(formatCredits({ quotaId: "premium", remaining: 0, entitlement: 0, unlimited: true })).toBe("∞");
  });
});

describe("fetchCredits", () => {
  const okBody = { quota_snapshots: { chat: snapshot(194, 200) } };

  it("returns parsed credits on success", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => okBody }));
    const info = await fetchCredits("tok", fetchImpl);
    expect(info).toMatchObject({ quotaId: "chat", remaining: 194 });
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
