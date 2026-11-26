import { useDemo } from "../../demo/state";
import { useAuditDataSoft } from "../../reports/inspection/load";
import { externalUsers, type ExternalUser } from "./external";

/** The outside auditor, as a user row, while access is given. */
export function useExternalUsers(): ExternalUser[] {
  const { state } = useDemo();
  const d = useAuditDataSoft();
  if (d === null) return [];
  const last = state.auditorViews.at(-1);
  return externalUsers(state.auditorGrant, state.auditorEnded !== null,
    last === undefined ? null : `${last.on}, view ${last.n}`, d.dateText);
}
