import { fils } from "@payroll/engine";
import { Explainable } from "../../components/explain";
import type { Explanation } from "../../components/explain/types";
import { waitingList } from "../../demo/approvals";
import { isBlocking, openIssues, runApprovalId } from "../../demo/derive";
import { figures } from "../../demo/figures";
import { useLiveExplain } from "../../demo/live-explain-load";
import { useRunDetail } from "../../demo/useRunDetail";
import { useDemo } from "../../demo/state";
import { Money } from "../../ui/Money";
import { ReportPage } from "../../ui/templates";
import { beforeApproval } from "../dash/model";
import { useIssuePhrase, useIssueWords } from "../dash/Panel";
import {
  Count,
  linkPoints,
  Summary,
  useRunState,
  type Column,
} from "../dash/Summary";
import { areaHref } from "../dash/itemSeam";
import { useReportCrumbs } from "../fmt";
import { useReportsSource } from "../load";
import { useTableMoney } from "./nb";
import { useMoreSource } from "./load";
import type { MoreSource } from "./source";

type Item = MoreSource["brief"]["items"][number];
import { briefRows } from "./rows";

/**
 * The brief on one screen: what changed this week, what needs a
 * decision and what is at risk, each as short points with a figure.
 * Live figures (sign-off, what stops pay, held pay) follow the demo.
 */
function useColumns(items: Item[], waitingWhy?: Explanation): Column[] {
  const { data, state } = useDemo();
  const src = useReportsSource();
  const words = useIssueWords();
  const run = useRunState();
  const h = data.headline();
  const sep = src.months.at(-2)!;
  const b = beforeApproval(data, state);
  const w = words(b);
  const waiting = waitingList(data, state).length;
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
      { key: "waiting", figure: waitingWhy === undefined
        ? <Count n={waiting} /> : (
          <Explainable explanation={waitingWhy}>
            <Count n={waiting} /></Explainable>),
        text: "Requests waiting in the decisions inbox" },
      { key: "probation", figure: <Count n={n("probation")} />,
        text: n("probation") === 1 ? "Probation to decide by its end date"
          : "Probations to decide by their end dates" },
    ] },
    { id: "risk", title: "At risk", points: [
      { key: "stops", figure: <Count n={b.stops} unit={w.unit} />,
        text: "Before sign-off", meta: w.sub,
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
  const { brief, briefExplain } = useMoreSource();
  const live = useLiveExplain();
  const detail = useRunDetail();
  const { scope } = detail;
  const { data, state } = useDemo();
  const m = useTableMoney();
  const phrase = useIssuePhrase();
  const crumbs = useReportCrumbs();
  const list = waitingList(data, state);
  const waitingWhy = live.waitingExplain(data, list, scope);
  const issuesWhy = live.issuesExplain(data,
    openIssues(data, state).filter(isBlocking), scope);
  const columns = useColumns(brief.items, waitingWhy);
  // A live row's working must follow the state: held pay from the
  // run as it stands; a settlement with dues added has no working yet.
  const why = brief.items.map((i) => i.live === "issues-open" ? issuesWhy
    : i.live === "held" ? detail.explain["run:held"]
      : i.live === "settlement" && i.subjectId !== null &&
        state.otherDues[i.subjectId] !== undefined ? undefined
        : briefExplain[i.id]);
  const runId = runApprovalId(data);
  // The live rows come from the shared figures; what stops pay reads
  // as everywhere else ("2 stop pay, 3 to check").
  const rows = briefRows(brief, { fig: figures(data, state),
    verdict: runId === null ? undefined : state.decided[runId],
    dues: state }, m).map((r, i) => brief.items[i]?.live === "issues-open"
    ? [r[0]!, r[1]!, phrase(beforeApproval(data, state))] : r);
  return (
    <ReportPage title="Owner brief" period={brief.title} crumbs={crumbs}
      chart={<Summary label="This week in brief"
        columns={linkPoints(columns, areaHref,
        ["waiting"])} />}
      explain={(r, c) => c === 2 ? why[r] : undefined}
      columns={[{ label: "Item" }, { label: "What it is, and what next" },
        { label: "Figure", end: true }]}
      rowHref={(r) => areaHref(String(rows[r]?.[0] ?? ""))}
      rows={rows} csvName="owner-brief-2026-10-27.csv" note={brief.note} />
  );
}
