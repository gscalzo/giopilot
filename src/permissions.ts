/** A permission decision, mirroring the SDK's PermissionRequestResult kinds. */
export type PermissionDecision =
  | { kind: "approve-once" }
  | { kind: "approve-for-session" }
  | { kind: "approve-for-location" }
  | { kind: "approve-permanently" }
  | { kind: "reject"; feedback?: string };

/** The subset of the SDK's PermissionRequest we inspect. */
export interface PermissionRequestLike {
  kind: string;
  toolName?: string;
  fileName?: string;
  fullCommandText?: string;
}

/** An extension gate: return a decision to handle the request, or undefined to abstain. */
export type PermissionGate = (req: PermissionRequestLike) => PermissionDecision | undefined;

export type PermissionRule = "allow" | "deny";

/** Per-kind policy, e.g. { shell: "deny" }. Unlisted kinds are allowed. */
export type PermissionPolicy = Record<string, PermissionRule>;

/**
 * Build an onPermissionRequest handler: extension gates run first (first
 * non-undefined wins), then the settings policy (deny → reject, otherwise
 * approve-once). With no policy and no gates this approves everything.
 */
export function composePermissions(policy: PermissionPolicy, gates: PermissionGate[]) {
  return (req: PermissionRequestLike): PermissionDecision => {
    for (const gate of gates) {
      const decision = gate(req);
      if (decision) return decision;
    }
    if (policy[req.kind] === "deny") {
      return { kind: "reject", feedback: `Denied by giopilot policy: ${req.kind}` };
    }
    return { kind: "approve-once" };
  };
}
