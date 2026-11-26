import { useRunApproval } from "../../demo/actions";
import { useDemo } from "../../demo/state";
import { useRunDetail } from "../../demo/useRunDetail";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import { ReportPage, type Cell } from "../../ui/templates";
import { HBars, SplitBar } from "../dash/Bars";
import {
  beforeApproval,
  byCost,
  byPeople,
  execTiles,
  hrTiles,
  topSlices,
  trendBars,
  waitingCount,
} from "../dash/model";
import { Panel, useIssuePhrase, useIssueWords } from "../dash/Panel";
import { Tiles } from "../dash/Tiles";
import { TrendChart } from "../dash/TrendChart";
import s from "../dash/dash.module.css";
import { hours, percent, plural, share, useMoney, useReportCrumbs }
  from "../fmt";
import { useReportsSource } from "../load";

const COLUMNS = [{ label: "Measure" }, { label: "Now", end: true },
  { label: "Compared with", end: true }, { label: "What it tells you" }];

/** The word under this run's bar: where the approval stands. */
export function useRunWord(): string {
  const run = useRunApproval();
  return run.phase === "file" ? "Signed off"
    : run.phase === "declined" ? "Sent back" : "To approve";
}

/**
 * HR dashboard: four tiles (people paid, what stops the run, leave and
 * overtime), the company by nationality and by department, then the
 * details table. Every figure is a selector another screen shows.
 */
export function DashboardHr() {
  const src = useReportsSource();
  const crumbs = useReportCrumbs();
  const { data, state } = useDemo();
  const { lang } = useLocale();
  const run = useRunDetail();
  const words = useIssueWords();
  const phrase = useIssuePhrase();
  const last = src.months.at(-1)!;
  const sum = (k: "start" | "joined" | "departed" | "now"): number =>
    src.departments.reduce((n, d) => n + d[k], 0);
  const docs = data.documents();
  const soon = docs.filter((d) => d.daysLeft >= 0 && d.daysLeft <= 30);
  const gone = docs.filter((d) => d.daysLeft < 0);
  const b = beforeApproval(data, state);
  const waiting = waitingCount(data, state);
  const nat = run.nationalities;
  const rows = [
    ["Before approval", phrase(b), "-",
      "What stops pay holds the whole run; checks do not"],
    ["People on the payroll", String(sum("now")),
      `${sum("start")} on 1 January`, "Employed today"],
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
  const board = (
    <div className={s.board}>
      <Tiles label="Key figures" tiles={hrTiles(src, data, state, words)} />
      <div className={s.panels}>
        <Panel id="dash-nat" wide title="People by nationality"
          note={`${nat.total} people, as of ${formatDate(nat.asOf, lang)}`}>
          <SplitBar label="People by nationality" unit={["person", "people"]}
            slices={topSlices(nat.rows.map((r) => ({ name: r.name,
              count: r.count })), 4)} />
        </Panel>
        <Panel id="dash-dept" wide title="People by department"
          note="Employed today">
          <HBars label="People by department" rows={byPeople(data)
            .map((d) => ({ key: d.id, label: d.name[lang],
              value: { n: d.headcount } }))} />
        </Panel>
      </div>
    </div>
  );
  return (
    <ReportPage crumbs={crumbs}
      title="HR dashboard" period={`As of today, ${last.label} run`}
      chart={board}
      columns={COLUMNS} rows={rows} csvName="hr-dashboard-2026-10.csv"
      note={"Each figure comes from the same data as the pay run, the " +
        "headcount, leave and documents reports and the approvals inbox. " +
        "Sparklines run January to October; the dashed line is " +
        "September's level."} />
  );
}

/**
 * Executive dashboard: four tiles (net and gross pay, people paid,
 * what stops the run), gross pay by month with September and October
 * marked, cost by department, then the details table.
 */
export function DashboardExec() {
  const src = useReportsSource();
  const crumbs = useReportCrumbs();
  const { data, state } = useDemo();
  const { lang } = useLocale();
  const { signed } = useMoney();
  const words = useIssueWords();
  const runWord = useRunWord();
  const now = src.months.at(-1)!;
  const before = src.months.at(-2)!;
  const head = data.headline();
  const depts = byCost(data);
  const top = depts[0];
  const v = src.variance(now.month, before.month);
  const main = v.drivers[0];
  const waiting = waitingCount(data, state);
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
  const board = (
    <div className={s.board}>
      <Tiles label="Key figures"
        tiles={execTiles(src, data, state, words)} />
      <div className={s.panels}>
        <Panel id="dash-trend" wide title="Gross pay by month"
          note={`${src.months[0]!.label.slice(0, 3)} to ` +
            `${now.label}, from zero`}>
          <TrendChart label={"Gross pay by month, January to October; " +
            "September paid, October " + runWord.toLowerCase()}
          bars={trendBars(src, runWord)} />
        </Panel>
        <Panel id="dash-cost" wide title="Cost by department"
          note={`Gross pay, ${now.label}`}>
          <HBars label="Cost by department" rows={depts.map((d) => ({
            key: d.id, label: d.name[lang], value: { fils: d.costFils },
            meta: plural(d.headcount, "person", "people") }))} />
        </Panel>
      </div>
    </div>
  );
  return (
    <ReportPage crumbs={crumbs}
      title="Executive dashboard"
      period={`${now.label} run against ${before.label}`}
      chart={board}
      columns={COLUMNS} rows={rows}
      csvName="executive-dashboard-2026-10.csv"
      note={"Figures are the run as it stands today, including the pay " +
        "still held out of the file. Sparklines run January to October; " +
        "the dashed line is September's level. Open Variance for the " +
        "full split."} />
  );
}
