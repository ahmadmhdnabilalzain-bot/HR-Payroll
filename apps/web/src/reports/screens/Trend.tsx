import { fils } from "@payroll/engine";
import { Money } from "../../ui/Money";
import { BarChart, ReportPage, type Cell } from "../../ui/templates";
import { changeText, plural, useMoney, useReportCrumbs } from "../fmt";
import { useReportsSource } from "../load";

/** Payroll trend, January to October: a bar a month, then the table. */
export function Trend() {
  const src = useReportsSource();
  const crumbs = useReportCrumbs();
  const { signed } = useMoney();
  const last = src.months.at(-1)!;
  const rows: Cell[][] = src.months.map((x, i) => {
    const before = src.months[i - 1];
    const diff = before === undefined ? null : x.gross - before.gross;
    return [x.label, x.paid ? "Paid" : "Waiting for approval",
      plural(x.headcount, "person", "people"), { fils: x.gross },
      { fils: x.net }, before === undefined || diff === null
        ? "First month shown" : changeText(diff, before.gross, signed)];
  });
  const total = fils(src.months.reduce((n, x) => n + x.gross, 0n));
  const net = fils(src.months.reduce((n, x) => n + x.net, 0n));
  return (
    <ReportPage crumbs={crumbs} title="Payroll trend"
      period={`${src.months[0]!.label} to ${last.label}`}
      figure={{ label: `Gross pay, ${src.months[0]!.label} to ` +
        last.label, value: <Money value={total} tween={false} /> }}
      chart={<BarChart label={"Gross pay by month, " +
        `${src.months[0]!.label} to ${last.label}`}
      data={src.months.map((x) => ({ label: x.label.slice(0, 3),
        value: x.gross, focus: x.month === last.month }))} />}
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
        "not a bank record. October is the run waiting for approval. " +
        "Open Variance to see why a month moved."} />
  );
}
