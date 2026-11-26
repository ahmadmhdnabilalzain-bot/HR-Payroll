import { pendingApprovals } from "../../demo/derive";
import { useDemo } from "../../demo/state";
import { Money } from "../../ui/Money";
import { ReportPage, type Cell } from "../../ui/templates";
import { hours, percent, plural, share, useMoney, useReportCrumbs }
  from "../fmt";
import { useReportsSource } from "../load";

const COLUMNS = [{ label: "Measure" }, { label: "Now", end: true },
  { label: "Compared with", end: true }, { label: "What it tells you" }];

/** HR dashboard: people, papers and what is waiting, in one table. */
export function DashboardHr() {
  const src = useReportsSource();
  const crumbs = useReportCrumbs();
  const { data, state } = useDemo();
  const last = src.months.at(-1)!;
  const sum = (k: "start" | "joined" | "departed" | "now"): number =>
    src.departments.reduce((n, d) => n + d[k], 0);
  const docs = data.documents();
  const soon = docs.filter((d) => d.daysLeft >= 0 && d.daysLeft <= 30);
  const gone = docs.filter((d) => d.daysLeft < 0);
  const stops = data.headline().issuesOpen;
  const waiting = pendingApprovals(data, state).length;
  const rows = [
    ["Open items that stop pay", String(stops), "-", "Fix these " +
      "before the run can be signed off"],
    ["People on the payroll", String(sum("now")),
      `${sum("start")} on 1 January`, "Employed on the report date"],
    ["Joined this year", String(sum("joined")), "-",
      src.joiners.join(", ") || "Nobody"],
    ["Left this year", String(sum("departed")), "-",
      src.leavers.join(", ") || "Nobody"],
    ["Turnover this year", sum("departed") === 0 ? "None"
      : share(sum("departed"), (sum("start") + sum("now")) / 2), "-",
    "People who left, against the average headcount"],
    ["Papers expiring in 30 days", String(soon.length),
      `${gone.length} already expired`, "Visas and Emirates IDs " +
        "to renew"],
    ["Waiting for a decision", String(waiting), "-",
      "Requests in the decisions inbox"],
    [`Unpaid leave in ${last.label}`, plural(last.unpaidDays, "day",
      "days"), `${plural(last.sickDays, "sick day", "sick days")}`,
    "Working days taken in the run month"],
  ];
  return (
    <ReportPage crumbs={crumbs}
      title="HR dashboard" period={`As of the report date, ` +
      `${last.label} run`}
    figure={{ label: "Open items that stop pay", value: String(stops) }}
    columns={COLUMNS} rows={rows} csvName="hr-dashboard-2026-10.csv"
    note={"Each row comes from the same data as the headcount, leave " +
      "and documents reports and the decisions inbox."} />
  );
}

/** Executive dashboard: the run, what moved it, and what it costs. */
export function DashboardExec() {
  const src = useReportsSource();
  const crumbs = useReportCrumbs();
  const { data, state } = useDemo();
  const { signed } = useMoney();
  const now = src.months.at(-1)!;
  const before = src.months.at(-2)!;
  const head = data.headline();
  const top = [...data.departments()].sort((a, b) =>
    a.costFils < b.costFils ? 1 : -1)[0];
  const v = src.variance(now.month, before.month);
  const main = v.drivers[0];
  const waiting = pendingApprovals(data, state).length;
  const rows: Cell[][] = [
    ["Gross pay", { fils: now.gross }, { fils: before.gross },
      `${signed(v.grossChange)} (${percent(v.grossChange,
        before.gross)}) on ${before.label}`],
    ["Biggest cause of the change", main === undefined ? "-"
      : { fils: main.amount, signed: true }, main?.label ?? "-",
    main === undefined ? "Nothing moved" : main.people.join(", ")],
    ["People paid", String(now.headcount), String(before.headcount),
      "Includes the leaver's part month"],
    ["Overtime this month", { fils: now.overtimeAmount },
      { fils: before.overtimeAmount }, `${hours(now.overtimeMinutes)} hours ` +
        `across ${plural(now.overtimePeople, "person", "people")}`],
    ["Held out of the salary file", { fils: head.heldNetFils }, "-",
      "Net pay with no valid bank account yet"],
    ["Waiting for your decision", String(waiting), "-",
      "Open Home to decide"],
    ["Biggest department", top === undefined ? "-"
      : { fils: top.costFils },
      top === undefined ? "-" : top.name.en, "Gross cost for the month"],
  ];
  return (
    <ReportPage crumbs={crumbs}
      title="Executive dashboard"
      period={`${now.label} run against ${before.label}`}
      figure={{ label: "Net pay for the run", value: (
        <Money value={head.netTotalFils} tween={false} />) }}
      columns={COLUMNS} rows={rows}
      csvName="executive-dashboard-2026-10.csv"
      note={"Figures are the run as it stands today, including the pay " +
        "still held out of the file. Open Variance for the full split."} />
  );
}
