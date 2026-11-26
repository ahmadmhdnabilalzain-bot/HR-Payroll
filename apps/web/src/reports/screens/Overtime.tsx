import { fils } from "@payroll/engine";
import { ReportPage } from "../../ui/templates";
import { hours, plural, useMoney, useReportCrumbs } from "../fmt";
import { useReportsSource } from "../load";

/** Overtime cost by month, with who earned it in the latest month. */
export function Overtime() {
  const src = useReportsSource();
  const crumbs = useReportCrumbs();
  const { m } = useMoney();
  const rows = src.months.map((x) => [x.label,
    x.overtimePeople === 0 ? "None"
      : plural(x.overtimePeople, "person", "people"),
    x.overtimeMinutes === 0 ? "-" : hours(x.overtimeMinutes),
    m(x.overtimeAmount)]);
  const max = src.months.reduce((a, x) => x.overtimeAmount > a
    ? x.overtimeAmount : a, 0n);
  const bars = src.months.map((x) => max === 0n ? 0
    : Number(x.overtimeAmount * 1000n / max));
  const total = fils(src.months.reduce((n, x) => n + x.overtimeAmount,
    0n));
  const last = src.months.at(-1)!.month;
  const who = src.overtime.filter((l) => l.month === last).map((l) =>
    `${l.name} ${hours(l.minutes)} hours (${m(l.amount)})`);
  return (
    <ReportPage crumbs={crumbs}
      title="Overtime cost" period={`${src.months[0]!.label} ` +
      `to ${src.months.at(-1)!.label}`}
    figure={{ label: "Overtime paid this year",
      value: m(total) }}
    columns={[{ label: "Month" }, { label: "People" },
      { label: "Hours", end: true }, { label: "Cost", end: true }]}
    rows={rows} bars={bars} csvName="overtime-cost-2026.csv"
    note={`${src.months.at(-1)!.label}: ${who.join("; ")}. Overtime is ` +
      "worked out by the pay rules from the hours on the timesheet."} />
  );
}
