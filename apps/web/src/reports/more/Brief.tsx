import { openApprovals } from "../../demo/approvals";
import { runApprovalId } from "../../demo/derive";
import { figures } from "../../demo/figures";
import { useDemo } from "../../demo/state";
import { ReportPage } from "../../ui/templates";
import { useTableMoney } from "./nb";
import { useMoreSource } from "./load";
import { briefRows } from "./rows";

/** X25: this week's pack for the owner, in the order owners ask. */
export function OwnerBriefScreen() {
  const { brief } = useMoreSource();
  const { data, state } = useDemo();
  const m = useTableMoney();
  const runId = runApprovalId(data);
  const waiting = openApprovals(data, state).length;
  const rows = briefRows(brief, { fig: figures(data, state),
    verdict: runId === null ? undefined : state.decided[runId],
    settlementFils: null }, m);
  return (
    <ReportPage title="Owner brief" period={brief.title}
      figure={{ label: "Waiting for a decision", value: String(waiting) }}
      columns={[{ label: "Item" }, { label: "What it is, and what next" },
        { label: "Figure", end: true }]}
      rows={rows} csvName="owner-brief-2026-10-27.csv" note={brief.note} />
  );
}
