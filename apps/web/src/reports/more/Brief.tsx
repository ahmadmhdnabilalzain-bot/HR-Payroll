import { fils } from "@payroll/engine";
import {
  openIssues,
  pendingApprovals,
  runApprovalId,
} from "../../demo/derive";
import { useDemo } from "../../demo/state";
import { Money } from "../../ui/Money";
import { ReportPage } from "../../ui/templates";
import { beforeApproval } from "../dash/model";
import { useIssuePhrase, useIssueWords } from "../dash/Panel";
import { Count, Summary, useRunState, type Column } from "../dash/Summary";
import { useReportCrumbs } from "../fmt";
import { useReportsSource } from "../load";
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

/**
 * The brief on one screen: what changed this week, what needs a
 * decision and what is at risk, each as short points with a figure.
 * Live figures (sign-off, what stops pay, held pay) follow the demo.
 */
function useColumns(items: Item[]): Column[] {
  const { data, state } = useDemo();
  const src = useReportsSource();
  const words = useIssueWords();
  const run = useRunState();
  const h = data.headline();
  const sep = src.months.at(-2)!;
  const b = beforeApproval(data, state);
  const w = words(b);
  const waiting = pendingApprovals(data, state).length;
  const get = (id: string): Item | undefined =>
    items.find((i) => i.id === id);
  const n = (id: string): number => get(id)?.count ?? 0;
  const left = get("left");
  return [
    { id: "changed", title: "What changed", points: [
      { key: "net", figure: <Money value={h.netTotalFils} tween={false} />,
        text: "October net pay",
        meta: <><Money value={fils(h.netTotalFils - sep.net)} size="sm"
          signed tween={false} /> against September</> },
      { key: "joined", figure: <Count n={n("joined")} />,
        text: n("joined") === 1 ? "Joined this month"
          : "People joined this month" },
      { key: "left", figure: <Count n={n("left")} />,
        text: "Leaving or left",
        ...(left === undefined ? {} : { meta: left.text }) },
    ] },
    { id: "decide", title: "Needs a decision", points: [
      { key: "run", text: "October pay run", state: run,
        meta: run.meta },
      { key: "waiting", figure: <Count n={waiting} />,
        text: "Requests waiting in the approvals inbox" },
      { key: "probation", figure: <Count n={n("probation")} />,
        text: n("probation") === 1 ? "Probation to decide by its end date"
          : "Probations to decide by their end dates" },
    ] },
    { id: "risk", title: "At risk", points: [
      { key: "stops", figure: <Count n={b.stops} unit={w.unit} />,
        text: "Before approval", meta: w.sub,
        ...(b.stops > 0 ? { state: { tone: "bad" as const,
          word: "Holds the whole run" } } : {}) },
      h.heldNetFils === 0n
        ? { key: "held", figure: "None",
          text: "Held out of the salary file",
          meta: "Everyone's pay is in the salary file" }
        : { key: "held", figure: <Money value={h.heldNetFils}
          tween={false} />, text: "Held out of the salary file",
        meta: "No valid bank account yet" },
      { key: "docs", figure: <Count n={n("docs-soon")} />,
        text: "Documents ending in 30 days",
        meta: `${n("docs-out")} past expiry` },
    ] },
  ];
}

/** X25: this week's pack for the owner, in the order owners ask. */
export function OwnerBriefScreen() {
  const { brief } = useMoreSource();
  const { data, state } = useDemo();
  const m = useTableMoney();
  const now = useNext();
  const phrase = useIssuePhrase();
  const columns = useColumns(brief.items);
  const crumbs = useReportCrumbs();
  const rows = brief.items.map((i) => {
    const n = now(i);
    // Held pay follows the IBANs entered, as the pay run does.
    const figure = i.live === "issues-open"
      ? phrase(beforeApproval(data, state))
      : i.id === "held" ? (data.headline().heldNetFils === 0n ? "None"
        : m(data.headline().heldNetFils))
      : i.amount !== null ? m(i.amount)
        : n.count !== null ? String(n.count) : "";
    return [`${i.area}: ${i.item}`, `${i.text} ${n.next}`, figure];
  });
  return (
    <ReportPage title="Owner brief" period={brief.title} crumbs={crumbs}
      chart={<Summary label="This week in brief" columns={columns} />}
      columns={[{ label: "Item" }, { label: "What it is, and what next" },
        { label: "Figure", end: true }]}
      rows={[...rows, ...brief.dates.map((d) =>
        [`Dates: ${d.label}`, d.text, ""])]}
      csvName="owner-brief-2026-10-27.csv" note={brief.note} />
  );
}
