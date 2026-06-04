import { describe, it, expect, vi } from "vitest";
import { composePermissions } from "./permissions.js";

describe("composePermissions", () => {
  it("approves every kind by default (no policy, no gates)", () => {
    const handler = composePermissions({}, []);
    expect(handler({ kind: "shell" })).toEqual({ kind: "approve-once" });
    expect(handler({ kind: "write" })).toEqual({ kind: "approve-once" });
  });

  it("rejects a kind denied by policy and approves others", () => {
    const handler = composePermissions({ shell: "deny" }, []);
    expect(handler({ kind: "shell" }).kind).toBe("reject");
    expect(handler({ kind: "read" })).toEqual({ kind: "approve-once" });
  });

  it("lets an extension gate override the policy", () => {
    const gate = (req: { kind: string }) =>
      req.kind === "url" ? ({ kind: "reject" as const, feedback: "no net" }) : undefined;
    const handler = composePermissions({}, [gate]);
    expect(handler({ kind: "url" })).toEqual({ kind: "reject", feedback: "no net" });
    expect(handler({ kind: "read" })).toEqual({ kind: "approve-once" });
  });

  it("uses the first gate that returns a decision", () => {
    const first = vi.fn(() => ({ kind: "approve-for-session" as const }));
    const second = vi.fn(() => ({ kind: "reject" as const }));
    const handler = composePermissions({}, [first, second]);
    expect(handler({ kind: "shell" })).toEqual({ kind: "approve-for-session" });
    expect(second).not.toHaveBeenCalled();
  });

  it("falls through to policy when all gates abstain", () => {
    const gate = vi.fn(() => undefined);
    const handler = composePermissions({ write: "deny" }, [gate]);
    expect(handler({ kind: "write" }).kind).toBe("reject");
    expect(gate).toHaveBeenCalled();
  });
});
