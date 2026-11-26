import type { Role } from "./state";

/**
 * H15: policies read and acknowledged during the demo. One slice in the
 * demo store, like verify-state.ts: an acknowledgement names who, their
 * role, the demo's date and the version they read, and has an undo.
 * The key is the person and the policy, so one person acknowledges one
 * policy once; a newer version asks again.
 */
export interface PolicyAck {
  by: string;
  role: Role;
  /** ISO date: the demo's today. */
  on: string;
  /** The version of the policy that was read. */
  version: string;
}

export interface PoliciesSlice {
  /** `${personId}|${policyId}` to the acknowledgement. */
  policyAcks: Record<string, PolicyAck>;
}

export type PoliciesAction =
  | { type: "policy-ack"; policyId: string; ack: PolicyAck }
  | { type: "policy-unack"; policyId: string; by: string };

export const POLICIES_INITIAL: PoliciesSlice = { policyAcks: {} };

export const ackKey = (by: string, policyId: string): string =>
  `${by}|${policyId}`;

export function reducePolicies<S extends PoliciesSlice>(s: S,
  a: PoliciesAction): S {
  switch (a.type) {
    case "policy-ack": return { ...s, policyAcks: { ...s.policyAcks,
      [ackKey(a.ack.by, a.policyId)]: a.ack } };
    case "policy-unack": {
      const { [ackKey(a.by, a.policyId)]: _gone, ...rest } = s.policyAcks;
      return { ...s, policyAcks: rest };
    }
  }
}
