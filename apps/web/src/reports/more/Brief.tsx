import {
  openIssues,
  pendingApprovals,
  runApprovalId,
} from "../../demo/derive";
import { useDemo } from "../../demo/state";
import { ReportPage } from "../../ui/templates";
import { useTableMoney } from "./nb";
import { useMoreSource } from "./load";
import type { MoreSource } from "./source";

type Item = MoreSource["brief"]["items"][number];

/** What the demo has done to a row since it was written. */
function useNext(): (i: Item) => { next: string; count: number | null } {
  const { data, state } = useDemo();
  const runId = runApprovalId(data);
  const verdict = runId === null ? undefined : state.decided[runId];
  const open = openIssues(data, state).length;
  return (i) => {
    if (i.live === "issues-open") {
      return { count: open, next: open === 0 ? "Nothing left to fix."
        : i.next };
    }
    if (i.live === "approvals-waiting") {
      if (verdict === "approve") return { count: i.count,
        next: "Signed off. The salary file can be made." };
      if (verdict === "decline") return { count: i.count,
        next: "Declined. The run goes back to be corrected." };
    }
    return { count: i.count, next: i.next };
  };
}

/** X25: this week's pack for the owner, in the order owners ask. */
export function OwnerBriefScreen() {
  const { brief } = useMoreSource();
  const { data, state } = useDemo();
  const m = useTableMoney();
  const now = useNext();
  const waiting = pendingApprovals(data, state).length;
  const rows = brief.items.map((i) => {
    const n = now(i);
    const figure = i.amount !== null ? m(i.amount)
      : n.count !== null ? String(n.count) : "";
    return [`${i.area}: ${i.item}`, `${i.text} ${n.next}`, figure];
  });
  return (
    <ReportPage title="Owner brief" period={brief.title}
      figure={{ label: "Waiting for a decision", value: String(waiting) }}
      columns={[{ label: "Item" }, { label: "What it is, and what next" },
        { label: "Figure", end: true }]}
      rows={[...rows, ...brief.dates.map((d) =>
        [`Dates: ${d.label}`, d.text, ""])]}
      csvName="owner-brief-2026-10-27.csv" note={brief.note} />
  );
}
