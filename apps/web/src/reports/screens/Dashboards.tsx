import { actionable, pendingApprovals } from "../../demo/derive";
import { useLiveExplain } from "../../demo/live-explain-load";
import { useDemo } from "../../demo/state";
import { useRunDetail } from "../../demo/useRunDetail";
import { ReportPage } from "../../ui/templates";
import { hours, percent, plural, share, useMoney } from "../fmt";
import { useReportsSource } from "../load";

const COLUMNS = [{ label: "Measure" }, { label: "Now", end: true },
  { label: "Compared with", end: true }, { label: "What it tells you" }];

/** HR dashboard: people, papers and what is waiting, in one table. */
export function DashboardHr() {
  const src = useReportsSource();
  const live = useLiveExplain();
  const { scope } = useRunDetail();
  const { data, state } = useDemo();
  const last = src.months.at(-1)!;
  const sum = (k: "start" | "joined" | "departed" | "now"): number =>
    src.heads[k];
  const docs = data.documents();
  const soon = docs.filter((d) => d.daysLeft >= 0 && d.daysLeft <= 30);
  const gone = docs.filter((d) => d.daysLeft < 0);
  const stops = data.headline().issuesOpen;
  const list = pendingApprovals(data, state);
  const waiting = list.length;
  const stopsWhy = live.issuesExplain(data,
    data.issues().filter(actionable), scope);
  const why = [stopsWhy, src.explain["headcount:now"], undefined, undefined,
    src.explain["turnover:total"], live.docsExplain(data, soon,
      "Papers expiring in 30 days", "ends in the next 30 days", scope),
    live.waitingExplain(data, list, scope)];
  const rows = [
    ["Open items that stop pay", String(stops), "-", "Fix these " +
      "before the run can be approved"],
    ["People on the payroll", String(sum("now")),
      `${sum("start")} on 1 January`, "Employed on the demo date"],
    ["Joined this year", String(sum("joined")), "-",
      src.joiners.join(", ") || "Nobody"],
    ["Left this year", String(sum("departed")), "-",
      src.leavers.join(", ") || "Nobody"],
    ["Turnover this year", sum("departed") === 0 ? "None"
      : share(sum("departed"), (sum("start") + sum("now")) / 2), "-",
    "People who left, against the average headcount"],
    ["Papers expiring in 30 days", String(soon.length),
      `${gone.length} already expired`, "Visas, Emirates IDs and " +
        "passports to renew"],
    ["Waiting for a decision", String(waiting), "-",
      "Requests in the approvals inbox"],
    [`Unpaid leave in ${last.label}`, plural(last.unpaidDays, "day",
      "days"), `${plural(last.sickDays, "sick day", "sick days")}`,
    "Working days taken in the run month"],
  ];
  return (
    <ReportPage title="HR dashboard" period={`As of the demo date, ` +
      `${last.label} run`}
    figure={{ label: "Open items that stop pay", value: String(stops),
      explanation: stopsWhy }}
    explain={(r, c) => c === 1 ? why[r] : undefined}
    columns={COLUMNS} rows={rows} csvName="hr-dashboard-2026-10.csv"
    note={"Each row comes from the same data as the headcount, leave " +
      "and documents reports and the approvals inbox."} />
  );
}

/** Executive dashboard: the run, what moved it, and what it costs. */
export function DashboardExec() {
  const src = useReportsSource();
  const live = useLiveExplain();
  const run = useRunDetail();
  const { data, state } = useDemo();
  const { m, signed } = useMoney();
  const now = src.months.at(-1)!;
  const before = src.months.at(-2)!;
  const head = data.headline();
  const top = [...data.departments()].sort((a, b) =>
    a.costFils < b.costFils ? 1 : -1)[0];
  const v = src.variance(now.month, before.month);
  const main = v.drivers[0];
  const list = pendingApprovals(data, state);
  const waiting = list.length;
  const why = [[src.explain[`trend:${now.month}`],
    src.explain[`trend:${before.month}`]],
  [main === undefined ? undefined : v.driverExplain[main.key]],
  [run.explain["run:people"]],
  [src.explain[`overtime:${now.month}`],
    src.explain[`overtime:${before.month}`]],
  [run.explain["run:held"]],
  [live.waitingExplain(data, list, run.scope)],
  [top === undefined ? undefined : run.explain[`dept-cost:${top.id}`]]];
  const rows = [
    ["Gross pay", m(now.gross), m(before.gross),
      `${signed(v.grossChange)} (${percent(v.grossChange,
        before.gross)}) on ${before.label}`],
    ["Biggest cause of the change", main === undefined ? "-"
      : signed(main.amount), main?.label ?? "-",
    main === undefined ? "Nothing moved" : main.people.join(", ")],
    ["People paid", String(now.headcount), String(before.headcount),
      "Includes the leaver's part month"],
    ["Overtime this month", m(now.overtimeAmount),
      m(before.overtimeAmount), `${hours(now.overtimeMinutes)} hours ` +
        `across ${plural(now.overtimePeople, "person", "people")}`],
    ["Held out of the salary file", m(head.heldNetFils), "-",
      "Net pay with no valid bank account yet"],
    ["Waiting for your decision", String(waiting), "-",
      "Open Home to decide"],
    ["Biggest department", top === undefined ? "-" : m(top.costFils),
      top === undefined ? "-" : top.name.en, "Gross cost for the month"],
  ];
  return (
    <ReportPage title="Executive dashboard"
      period={`${now.label} run against ${before.label}`}
      figure={{ label: "Net pay for the run", value: m(head.netTotalFils),
        explanation: run.explain["run:net"] }}
      explain={(r, c) => c === 0 ? undefined : why[r]?.[c - 1]}
      columns={COLUMNS} rows={rows}
      csvName="executive-dashboard-2026-10.csv"
      note={"Figures are the run as it stands today, including the pay " +
        "still held out of the file. Open Variance for the full split."} />
  );
}
