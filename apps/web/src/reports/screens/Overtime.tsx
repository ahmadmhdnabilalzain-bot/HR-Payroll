import { fils } from "@payroll/engine";
import { Money } from "../../ui/Money";
import { BarChart, ReportPage, type Cell } from "../../ui/templates";
import { hours, plural, useMoney, useReportCrumbs } from "../fmt";
import { useReportsSource } from "../load";

/** Overtime cost by month, with who earned it in the latest month. */
export function Overtime() {
  const src = useReportsSource();
  const crumbs = useReportCrumbs();
  const { m } = useMoney();
  const rows: Cell[][] = src.months.map((x) => [x.label,
    x.overtimePeople === 0 ? "None"
      : plural(x.overtimePeople, "person", "people"),
    x.overtimeMinutes === 0 ? "-" : hours(x.overtimeMinutes),
    { fils: x.overtimeAmount }]);
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
      value: <Money value={total} tween={false} /> }}
    chart={<BarChart label="Overtime cost by month"
      data={src.months.map((x) => ({ label: x.label.slice(0, 3),
        value: x.overtimeAmount, focus: x.month === last }))} />}
    columns={[{ label: "Month" }, { label: "People" },
      { label: "Hours", end: true }, { label: "Cost", end: true }]}
    rows={rows} total={["Total", "", hours(src.months.reduce((n, x) =>
      n + x.overtimeMinutes, 0)), { fils: total }]}
    csvName="overtime-cost-2026.csv"
    note={`${src.months.at(-1)!.label}: ${who.join("; ")}. Overtime is ` +
      "worked out by the pay rules from the hours on the timesheet."} />
  );
}
