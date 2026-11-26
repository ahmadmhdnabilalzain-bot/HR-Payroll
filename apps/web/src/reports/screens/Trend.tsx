import { fils } from "@payroll/engine";
import { Money } from "../../ui/Money";
import { ReportPage, type Cell } from "../../ui/templates";
import { trendBars } from "../dash/model";
import { Panel } from "../dash/Panel";
import { TrendChart } from "../dash/TrendChart";
import s from "../dash/dash.module.css";
import { useRunWord } from "./Dashboards";
import { changeText, plural, useMoney, useReportCrumbs } from "../fmt";
import { useReportsSource } from "../load";

/**
 * Payroll trend, January to October: this run's gross and its change
 * on September, a bar a month from zero on a labelled axis with
 * September (paid) and October (this run) marked, then the table.
 */
export function Trend() {
  const src = useReportsSource();
  const crumbs = useReportCrumbs();
  const { signed } = useMoney();
  const last = src.months.at(-1)!;
  const prev = src.months.at(-2)!;
  const runWord = useRunWord();
  const rows: Cell[][] = src.months.map((x, i) => {
    const before = src.months[i - 1];
    const diff = before === undefined ? null : x.gross - before.gross;
    return [x.label, x.paid ? "Paid" : "Waiting for sign-off",
      plural(x.headcount, "person", "people"), { fils: x.gross },
      { fils: x.net }, before === undefined || diff === null
        ? "First month shown" : changeText(diff, before.gross, signed)];
  });
  const total = fils(src.months.reduce((n, x) => n + x.gross, 0n));
  const net = fils(src.months.reduce((n, x) => n + x.net, 0n));
  return (
    <ReportPage crumbs={crumbs} title="Payroll trend"
      period={`${src.months[0]!.label} to ${last.label}`}
      figure={{ label: `Gross pay, ${last.label}`,
        value: <Money value={last.gross} tween={false} />,
        explanation: src.explain[`trend:${last.month}`] }}
      explain={(r, c) => {
        if (r === src.months.length) {
          return c === 3 ? src.explain["trend:total"] : undefined;
        }
        const k = src.months[r]?.month ?? "";
        return c === 3 ? src.explain[`trend:${k}`]
          : c === 4 ? src.explain[`trend-net:${k}`] : undefined;
      }}
      chart={(
        <div className={s.board}>
          <p className={s.lift}>
            {changeText(last.gross - prev.gross, prev.gross, signed)}
            {` against ${prev.label}`}</p>
          <Panel id="trend-chart" title="Gross pay by month"
            note={`${src.months[0]!.label.slice(0, 3)} to ${last.label}, ` +
              "from zero"}>
            <TrendChart label={"Gross pay by month, January to October; " +
              `September paid, October ${runWord.toLowerCase()}`}
            bars={trendBars(src, runWord)} />
          </Panel>
        </div>
      )}
      columns={[{ label: "Month" }, { label: "State" },
        { label: "People paid" }, { label: "Gross", end: true },
        { label: "Net", end: true },
        { label: "Gross against the month before", end: true }]}
      rows={rows}
      total={[`${src.months.length} months`, "", "", { fils: total },
        { fils: net }, ""]}
      csvName="payroll-trend-2026-01-to-10.csv"
      note={"January to September are worked out again from today's " +
        "pay and joining dates, so they show what the same rules give, " +
        "not a bank record. October is the run waiting for sign-off. " +
        "Open Variance to see why a month moved."} />
  );
}
