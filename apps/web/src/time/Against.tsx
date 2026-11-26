import { dayText } from "../people/words";
import { ReportPage } from "../ui/templates";
import { useTimeData, useWho } from "./shared";
import { hm, plural, W } from "./words";

/** T22, Attendance against shifts: late and absence for the month (RP). */
export function Against() {
  const t = useTimeData();
  const who = useWho();
  const sheets = t.sheets.filter((r) => who.visible.has(r.employeeId));
  const lates = sheets.reduce((n, r) => n + r.late.length, 0);
  const rows = sheets.map((r) => [who.name(r.employeeId),
    String(r.presentDays), hm(r.overtimeMinutes),
    hm(r.nightOvertimeMinutes),
    r.late.length === 0 ? "None" : r.late.map((l) =>
      `${dayText(l.date, who.lang)} (${plural(l.minutes, "min", "min")})`)
      .join(", "),
    r.unpaidDays === 0 ? "None" : plural(r.unpaidDays, "day", "days")]);
  return (
    <ReportPage title="Attendance against shifts" period={W.october}
      figure={{ label: "Late arrivals this month",
        value: String(lates) }}
      columns={[{ label: "Person" }, { label: "Days worked", end: true },
        { label: "Overtime", end: true }, { label: "Night overtime",
          end: true }, { label: "Late on" },
        { label: "Unpaid absence", end: true }]}
      rows={rows}
      note={`Each day is read against the person's shift by the payroll ` +
        `engine. Late means more than ${t.lateGraceMinutes} minutes after ` +
        "the shift starts (sample grace). Overtime is time past the shift."}
      csvName="attendance-against-shifts-2026-10.csv" />
  );
}
