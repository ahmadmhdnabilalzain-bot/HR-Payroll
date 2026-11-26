import { fils } from "@payroll/engine";
import { ReportPage } from "../../ui/templates";
import { changeText, plural, useMoney } from "../fmt";
import { useReportsSource } from "../load";

/** Payroll trend, January to October: one row per month. */
export function Trend() {
  const src = useReportsSource();
  const { m, signed } = useMoney();
  const rows = src.months.map((x, i) => {
    const before = src.months[i - 1];
    const diff = before === undefined ? null : x.gross - before.gross;
    return [x.label, x.paid ? "Paid" : "Waiting for approval",
      plural(x.headcount, "person", "people"), m(x.gross), m(x.net),
      before === undefined || diff === null ? "First month shown"
        : changeText(diff, before.gross, signed)];
  });
  const total = fils(src.months.reduce((n, x) => n + x.gross, 0n));
  return (
    <ReportPage title="Payroll trend"
      period={`${src.months[0]!.label} to ${src.months.at(-1)!.label}`}
      figure={{ label: "Gross pay, January to October",
        value: m(total) }}
      columns={[{ label: "Month" }, { label: "State" },
        { label: "People paid" }, { label: "Gross", end: true },
        { label: "Net", end: true },
        { label: "Gross against the month before", end: true }]}
      rows={rows} csvName="payroll-trend-2026-01-to-10.csv"
      note={"January to September are worked out again from today's " +
        "pay and joining dates, so they show what the same rules give, " +
        "not a bank record. October is the run waiting for approval. " +
        "Open Variance to see why a month moved."} />
  );
}
