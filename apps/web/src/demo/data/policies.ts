import {
  AS_OF,
  askPolicies,
  policyById,
  policyLibrary,
  POLICY_NOT_COVERED,
  POLICY_NOTE,
} from "@payroll/demo-data";
import type { PoliciesData } from "./policies-types";

/** The H15 view of the policy library. Imported only by adapter.ts. */
export function adaptPolicies(): PoliciesData {
  return { asOf: AS_OF, note: POLICY_NOTE, notCovered: POLICY_NOT_COVERED,
    library: policyLibrary, byId: policyById, ask: askPolicies };
}
