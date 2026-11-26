import type { DemoData, Issue } from "../demo/data/types";
import type { DemoState } from "../demo/state";

/**
 * The one severity vocabulary (critique item 9): an issue that holds
 * a person's pay out of the file or would make the bank reject it
 * "Stops pay"; every other open item is "Check".
 */
export type Severity = "stops-pay" | "check";

export function severityOf(d: DemoData, i: Issue): Severity {
  const id = i.employeeId ?? "";
  return d.heldIds().includes(id) || d.badIbanIds().includes(id)
    ? "stops-pay" : "check";
}

/** Open items about one person (settled ones leave the list). */
export function openItemsOf(d: DemoData, s: Pick<DemoState, "resolved">,
  id: string): Issue[] {
  return d.issues().filter((i) => i.employeeId === id &&
    i.kind === "issue" && s.resolved[i.id] === undefined);
}

/** People with at least one open item, for "Needs attention". */
export function attentionIds(d: DemoData, s: Pick<DemoState, "resolved">)
  : Set<string> {
  return new Set(d.issues().filter((i) => i.kind === "issue" &&
    i.employeeId !== null && s.resolved[i.id] === undefined)
    .map((i) => i.employeeId ?? ""));
}
