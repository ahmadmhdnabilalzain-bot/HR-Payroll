import { hrefOf } from "../demo/route";
import type { TimeData } from "../demo/data/time-types";
import { dayText, type Tone } from "../people/words";
import { FilterList } from "../ui/templates";
import { Status, useTimeData, useWho } from "./shared";

type Kind = "in" | "late" | "leave" | "absent" | "none";

export interface TodayRow {
  id: string;
  kind: Kind;
  clockIn: string | null;
  clockOut: string | null;
  source: string;
}

const WORD: Record<Kind, [string, Tone]> = {
  in: ["In", "ok"], late: ["Late", "warn"], leave: ["On leave", "neutral"],
  absent: ["Absent, unpaid", "danger"], none: ["Not recorded", "warn"],
};

/** Everyone on the payroll today, with what the clock says. */
export function todayRows(t: TimeData, visible: Set<string>): TodayRow[] {
  return t.activeToday.filter((id) => visible.has(id)).map((id) => {
    const day = t.days.find((d) => d.employeeId === id && d.date === t.asOf);
    const punch = t.punches.find((x) => x.employeeId === id &&
      x.date === t.asOf);
    const late = t.sheets.find((s) => s.employeeId === id)
      ?.late.some((l) => l.date === t.asOf) === true;
    const kind: Kind = day === undefined ? "none"
      : day.state === "leave" ? "leave"
        : day.state === "absent-unpaid" ? "absent"
          : late ? "late" : "in";
    return { id, kind, clockIn: day?.clockIn ?? null,
      clockOut: day?.clockOut ?? null, source: punch?.source ?? "" };
  });
}

/** People not in and not on leave: what needs a look today. */
export const needsLook = (r: TodayRow): boolean =>
  r.kind === "absent" || r.kind === "none" || r.kind === "late";

/** T10, Attendance today (LF). */
export function Today() {
  const t = useTimeData();
  const who = useWho();
  const rows = todayRows(t, who.visible);
  const inCount = rows.filter((r) => r.kind === "in" || r.kind === "late")
    .length;
  const dash = "–";
  return (
    <FilterList title="Attendance today"
      lede={`${inCount} of ${rows.length} in, ${dayText(t.asOf, who.lang)}. ` +
        "From the readers and phones."}
      rows={rows} rowKey={(r) => r.id}
      searchText={(r) => `${who.name(r.id)} ${who.jobOf(r.id)}`}
      rowHref={(r) => hrefOf("people", r.id)}
      segments={[
        { id: "all", label: "Everyone", match: () => true },
        { id: "look", label: "Needs a look", match: needsLook },
        { id: "in", label: "In", match: (r) => r.kind === "in" ||
          r.kind === "late" },
        { id: "leave", label: "On leave", match: (r) => r.kind === "leave" },
      ]}
      columns={[
        { key: "n", label: "Person", render: (r) => who.name(r.id) },
        { key: "s", label: "Status", render: (r) => (
          <Status tone={WORD[r.kind][1]}>{WORD[r.kind][0]}</Status>) },
        { key: "i", label: "In", end: true, render: (r) =>
          r.clockIn ?? dash },
        { key: "o", label: "Out", end: true, render: (r) =>
          r.clockOut ?? dash },
        { key: "w", label: "Where", render: (r) => r.source || dash },
      ]}
      empty="No one to show here. Pick another filter or clear the search."
    />
  );
}

