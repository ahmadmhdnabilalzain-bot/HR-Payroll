import { useState } from "react";
import { useRunApproval } from "../../demo/actions";
import { decisionsFor, waitingList } from "../../demo/approvals";
import { isBlocking, openIssues } from "../../demo/derive";
import { useLiveExplain } from "../../demo/live-explain-load";
import { useDemo } from "../../demo/state";
import { useRunDetail } from "../../demo/useRunDetail";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import { ReportPage, type Cell } from "../../ui/templates";
import { HBars, SplitBar } from "../dash/Bars";
import {
  beforeApproval,
  byCost,
  deptView,
  execTiles,
  hrTiles,
  topSlices,
} from "../dash/model";
import { Panel, useIssuePhrase, useIssueWords } from "../dash/Panel";
import { Tiles } from "../dash/Tiles";
import { ChangeBars } from "../dash/ChangeBars";
import { BeforeSignOffItems } from "../dash/Items";
import { areaHref, deptHrefByName } from "../dash/itemSeam";
import { hrefOf } from "../../demo/route";
import s from "../dash/dash.module.css";
import x from "./exec.module.css";
import { useFirstReveal } from "../../ui/firstReveal";
import { plural, useMoney, useReportCrumbs } from "../fmt";
import { useReportsSource } from "../load";
import { execDashboardRows, hrDashboardRows } from "./dashboard-rows";

/** Measure, figure, and what it tells you: last month's level, where
 * there is one, is said in the sentence (and on the tile above). */
const COLUMNS = [{ label: "Measure" }, { label: "Now", end: true },
  { label: "What it tells you" }];

/** The word under this run's bar: where the approval stands. */
export function useRunWord(): string {
  const run = useRunApproval();
  return run.phase === "file" ? "Signed off"
    : run.phase === "declined" ? "Sent back" : "To sign off";
}

/**
 * HR dashboard: four tiles (people paid, what stops the run, leave and
 * overtime), the company by nationality and by department, then the
 * details table. Every figure is a selector another screen shows.
 */
export function DashboardHr() {
  const src = useReportsSource();
  const crumbs = useReportCrumbs();
  const live = useLiveExplain();
  const { data, state } = useDemo();
  const { lang } = useLocale();
  const run = useRunDetail();
  const words = useIssueWords();
  const phrase = useIssuePhrase();
  const last = src.months.at(-1)!;
  const docs = data.documents();
  const soon = docs.filter((d) => d.daysLeft >= 0 && d.daysLeft <= 30);
  const nat = run.nationalities;
  const list = waitingList(data, state);
  const stopsWhy = live.issuesExplain(data,
    openIssues(data, state).filter(isBlocking), run.scope);
  // By row of hrDashboardRows: the shared figures, one source.
  const why = [stopsWhy, src.explain["headcount:now"],
    run.explain["run:people"], undefined, undefined,
    src.explain["turnover:total"], live.docsExplain(data, soon,
      "Papers expiring in 30 days", "ends in the next 30 days", run.scope),
    live.waitingExplain(data, list, run.scope)];
  // The shared rows, with what stops pay in Fix's own words.
  const rows = hrDashboardRows(src, data, state).map((r, i) => i !== 0 ? r
    : ["Before sign-off", phrase(beforeApproval(data, state)),
      "What stops pay holds the whole run; checks do not"]);
  const board = (
    <div className={s.board}>
      <Tiles label="Key figures" tiles={hrTiles(src, data, state, words)} />
      <div className={s.panels}>
        <Panel id="dash-items" wide title="Before sign-off"
          href="#/pay-run/fix"
          note={phrase(beforeApproval(data, state))}>
          <BeforeSignOffItems />
        </Panel>
        <Panel id="dash-nat" wide title="People by nationality"
          href="#/reports/nationality"
          note={`${nat.total} people, as of ${formatDate(nat.asOf, lang)}`}>
          <SplitBar label="People by nationality" unit={["person", "people"]}
            href={hrefOf("reports", "nationality")}
            slices={topSlices(nat.rows.map((r) => ({ name: r.name,
              count: r.count })), 4)} />
        </Panel>
        <Panel id="dash-dept" wide title="People by department"
          href="#/reports/headcount" note="Employed on the report date">
          <HBars label="People by department" rows={[...src.departments]
            .sort((a, b) => b.now - a.now).map((d) => ({ key: d.name,
              label: d.name, value: { n: d.now },
              href: deptHrefByName(data.departments(), d.name)
                ?? hrefOf("reports", "headcount") }))} />
        </Panel>
      </div>
    </div>
  );
  return (
    <ReportPage crumbs={crumbs}
      title="HR dashboard" period={`As of the report date, ` +
      `${last.label} run`}
      chart={board}
      explain={(r, c) => c === 1 ? why[r] : undefined}
      rowHref={(r) => areaHref(String(rows[r]?.[0] ?? ""))}
      columns={COLUMNS} rows={rows} csvName="hr-dashboard-2026-10.csv"
      note={"Each figure comes from the same data as the pay run, the " +
        "headcount, leave and documents reports and the decisions inbox. " +
        "Sparklines run January to October; the dashed line is " +
        "September's level."} />
  );
}

/**
 * Executive dashboard: four tiles (net and gross pay, people paid,
 * what stops the run), gross pay by month with September and October
 * marked, cost per head by department, then the details table.
 */
export function DashboardExec() {
  const src = useReportsSource();
  const crumbs = useReportCrumbs();
  const live = useLiveExplain();
  const run = useRunDetail();
  const { data, state } = useDemo();
  const { lang } = useLocale();
  const { m, signed } = useMoney();
  const words = useIssueWords();
  const phrase = useIssuePhrase();
  const runWord = useRunWord();
  const now = src.months.at(-1)!;
  const before = src.months.at(-2)!;
  const depts = byCost(data);
  const top = depts[0];
  const v = src.variance(now.month, before.month);
  const main = v.drivers[0];
  const list = decisionsFor(data, state);
  // By row of execDashboardRows: the working behind each "Now".
  const why = [src.explain[`trend:${now.month}`],
    main === undefined ? undefined : v.driverExplain[main.key],
    run.explain["run:people"], src.explain[`overtime:${now.month}`],
    run.explain["run:held"], live.waitingExplain(data, list, run.scope),
    top === undefined ? undefined : run.explain[`dept-cost:${top.id}`]];
  const rows = execDashboardRows(src, data, state,
    (f) => signed(f as never), (f) => m(f as never));
  // The lead tile (net pay) tips up into place, once per load. When
  // the tilt has played the wrapper drops it, so a later re-layout
  // (a resize, a full-page capture) never replays it mid-page and
  // leaves the first tile sitting low beside the others.
  const first = useFirstReveal("exec-top");
  const [tilt, setTilt] = useState(first);
  const board = (
    <div className={s.board}>
      <div className={tilt ? x.lead : x.still} onAnimationEnd={(e) => {
        if (e.animationName.includes("depth-in")) setTilt(false);
      }}>
        <Tiles label="Key figures"
          tiles={execTiles(src, data, state, words)}
          changeHref={hrefOf("reports", "variance")}
          explain={{ net: run.explain["run:net"],
            gross: run.explain["run:gross"],
            paid: run.explain["run:people"] }} />
      </div>
      <div className={s.panels}>
        <Panel id="dash-items" wide title="Before sign-off"
          href="#/pay-run/fix"
          note={phrase(beforeApproval(data, state))}>
          <BeforeSignOffItems />
        </Panel>
        <Panel id="dash-trend" wide title="Gross pay, month on month"
          href="#/reports/trend"
          note={`Change against the month before, ${src.months[1]!.label
            .slice(0, 3)} to ${now.label}`}>
          <ChangeBars months={src.months}
            hrefOf={(month) => hrefOf("reports", "variance", month)}
            label={"Change in gross pay " +
            "against the month before, February to October; October " +
            runWord.toLowerCase()} />
        </Panel>
        <Panel id="dash-cost" wide title="Cost per head by department"
          href="#/reports/departments"
          note={`Gross pay over people, ${now.label}; highest first`}>
          <HBars label="Cost per head by department" rows={deptView(data)
            .map((d) => ({ key: d.id, label: d.row.name[lang],
              value: { fils: d.perHead }, href: "#/reports/departments",
              meta: `${plural(d.row.headcount, "person", "people")} · ` +
                `${d.share}% of gross` }))} />
        </Panel>
      </div>
    </div>
  );
  return (
    <ReportPage crumbs={crumbs}
      title="Executive dashboard"
      period={`${now.label} run against ${before.label}`}
      chart={board}
      explain={(r, c) => c === 1 ? why[r] : undefined}
      rowHref={(r) => areaHref(String(rows[r]?.[0] ?? ""))}
      columns={COLUMNS} rows={rows}
      csvName="executive-dashboard-2026-10.csv"
      note={"Figures are the run as it stands today, including any pay " +
        "held out of the salary file. Sparklines run January to October; " +
        "the dashed line is September's level. Open Variance for the " +
        "full split."} />
  );
}
