import { hrefOf } from "../demo/route";
import type { DayRow, SheetRow } from "../demo/data/time-types";
import { dayText, type Tone } from "../people/words";
import { FilterList, RecordTabs } from "../ui/templates";
import { Outside } from "./Outside";
import { Status, useTimeData, useWho } from "./shared";
import s from "./time.module.css";
import { hm, plural, W } from "./words";

const lateDays = (r: SheetRow): string => r.late.length === 0 ? "None"
  : plural(r.late.length, "day", "days");

/** T14, Attendance register: October, one row a person (LF). */
export function Register() {
  const t = useTimeData();
  const who = useWho();
  const rows = t.sheets.filter((r) => who.visible.has(r.employeeId));
  return (
    <FilterList title="Attendance register"
      lede={`${W.october}. Days in, hours worked, overtime, late and ` +
        "absence for each person."}
      rows={rows} rowKey={(r) => r.employeeId}
      searchText={(r) => `${who.name(r.employeeId)} ` +
        who.jobOf(r.employeeId)}
      rowHref={(r) => hrefOf("time-off", "register", r.employeeId)}
      segments={[
        { id: "all", label: "Everyone", match: () => true },
        { id: "late", label: "Late", match: (r) => r.late.length > 0 },
        { id: "absent", label: "Absent", match: (r) => r.unpaidDays > 0 },
        { id: "ot", label: "Overtime", match: (r) => r.overtimeMinutes > 0 },
      ]}
      columns={[
        { key: "n", label: "Person", render: (r) => who.name(r.employeeId) },
        { key: "d", label: "Days in", end: true, render: (r) =>
          `${r.presentDays} of ${r.workingDays}` },
        { key: "w", label: "Worked", end: true, render: (r) =>
          hm(r.workedMinutes) },
        { key: "o", label: "Overtime", end: true, render: (r) =>
          hm(r.overtimeMinutes) },
        { key: "l", label: "Late", end: true, render: lateDays },
        { key: "u", label: "Unpaid absence", end: true, render: (r) =>
          r.unpaidDays === 0 ? "None" : plural(r.unpaidDays, "day", "days") },
      ]}
      empty="No one matches. Pick another filter or clear the search." />
  );
}

const DAY: Record<DayRow["state"], [string, Tone]> = {
  present: ["In", "ok"], leave: ["On leave", "neutral"],
  "absent-unpaid": ["Absent, unpaid", "danger"],
};

/** One person's month: summary, then each day and the late arrivals. */
export function RegisterRecord(q: { id: string }) {
  const t = useTimeData();
  const who = useWho();
  const sheet = t.sheets.find((x) => x.employeeId === q.id);
  if (sheet === undefined || !who.visible.has(q.id)) return <Outside />;
  const days = t.days.filter((d) => d.employeeId === q.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <RecordTabs title={who.name(q.id)}
      lede={`${who.jobOf(q.id)}. Attendance, ${W.october}.`}
      back={{ label: "Attendance register",
        href: hrefOf("time-off", "register") }}
      stats={[
        { label: "Days in", value: `${sheet.presentDays} of ` +
          `${sheet.workingDays}` },
        { label: "Worked", value: hm(sheet.workedMinutes) },
        { label: "Overtime", value: hm(sheet.overtimeMinutes) },
      ]}
      tabs={[
        { id: "days", label: "Days", render: () => (
          <ul className={s.dayList} aria-label="Days">
            <li className={`${s.dayRow} ${s.dayHead}`} aria-hidden="true">
              <span>Day</span><span>Status</span>
              <span className={s.num}>In</span>
              <span className={s.num}>Out</span>
              <span className={s.num}>Worked</span>
            </li>
            {days.map((d) => (
              <li key={d.date} className={s.dayRow}>
                <span>{dayText(d.date, who.lang)}</span>
                <Status tone={DAY[d.state][1]}>{DAY[d.state][0]}</Status>
                <span className={s.num}>{d.clockIn ?? "–"}</span>
                <span className={s.num}>{d.clockOut ?? "–"}</span>
                <span className={s.num}>{hm(d.workedMinutes)}</span>
              </li>
            ))}
          </ul>) },
        { id: "late", label: "Late and absence", render: () => (
          <div className={s.picker}>
            <p className={s.note}>
              Late means more than {t.lateGraceMinutes} minutes after the
              shift starts (sample grace).
            </p>
            {sheet.late.length === 0 && sheet.unpaidDays === 0 ? (
              <p className={s.muted}>No late arrivals and no unpaid
                absence this month.</p>
            ) : (
              <ul className={s.dayList} aria-label="Late and absence">
                {sheet.late.map((l) => (
                  <li key={l.date} className={s.dayRow}>
                    <span>{dayText(l.date, who.lang)}</span>
                    <Status tone="warn">Late</Status>
                    <span className={s.num}>{plural(l.minutes, "minute",
                      "minutes")}</span>
                  </li>
                ))}
                {days.filter((d) => d.state === "absent-unpaid").map((d) => (
                  <li key={d.date} className={s.dayRow}>
                    <span>{dayText(d.date, who.lang)}</span>
                    <Status tone="danger">Absent, unpaid</Status>
                    <span className={s.num}>Day not paid</span>
                  </li>
                ))}
              </ul>
            )}
          </div>) },
      ]} />
  );
}
