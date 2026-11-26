import { useState } from "react";
import { requestRows, visibleIds } from "../demo/time-off";
import { MonthCalendar, type CalEvent } from "../ui/templates";
import { History } from "../people/papers/History";
import { useRequests } from "../people/requests/useRequests";
import tpl from "../ui/templates/templates.module.css";

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const shift = (ym: string, step: number): string => {
  const [y, m] = ym.split("-").map(Number);
  const at = (y ?? 0) * 12 + (m ?? 1) - 1 + step;
  return `${String(Math.floor(at / 12))}-${String(at % 12 + 1)
    .padStart(2, "0")}`;
};

/**
 * E12: my calendar. Leave (booked and waiting), public holidays,
 * payday and training. A manager also sees the people they decide
 * leave for.
 */
export function MyCalendar() {
  const p = useRequests();
  const [month, setMonth] = useState(p.data.requests.asOf.slice(0, 7));
  const me = p.me;
  const manager = p.state.role === "manager";
  const team = manager ? visibleIds(p.data, p.state).filter((id) =>
    id !== me) : [];
  const who = [me, ...team];
  const types = p.data.people.leaveTypes();
  const marks = p.data.requests.marks(month);
  const leave = requestRows(p.data, p.state).filter((r) =>
    who.includes(r.employeeId) &&
    (r.state === "booked" || r.state === "waiting"));
  const events: CalEvent[] = [
    ...leave.map((r): CalEvent => ({ rowId: r.employeeId,
      start: r.startDate, end: r.endDate,
      tone: r.state === "booked" ? "booked" : "waiting",
      label: `${types.find((t) => t.id === r.leaveTypeId)?.name[p.lang] ??
        "Leave"}${r.state === "waiting" ? ", waiting" : ""}` })),
    ...marks.filter((m) => m.kind === "holiday").map((m): CalEvent => ({
      rowId: "company", start: m.from, end: m.to, tone: "holiday",
      label: m.label })),
    ...marks.filter((m) => m.kind === "payday" || m.kind === "cutoff")
      .map((m): CalEvent => ({ rowId: "pay", start: m.from, end: m.to,
        tone: "shift", label: m.label })),
    ...marks.filter((m) => m.kind === "training" &&
      m.employeeId !== null && who.includes(m.employeeId))
      .map((m): CalEvent => ({ rowId: m.employeeId ?? "", start: m.from,
        end: m.to, tone: "shift", label: `Training: ${m.label}` })),
  ];
  const [y, m] = month.split("-");
  const list = events.filter((e) => e.end >= `${month}-01` &&
    e.start <= `${month}-31`).sort((a, c) =>
    a.start.localeCompare(c.start));
  return (
    <div>
      <MonthCalendar title="My calendar"
        lede={manager ? "Your leave and your team's, public holidays, " +
          "payday and training. Holiday and pay dates are sample dates."
          : "Your leave, public holidays, payday and training. Holiday " +
            "and pay dates are sample dates."}
        month={month} monthLabel={`${MONTHS[Number(m) - 1] ?? ""} ${y ?? ""}`}
        rows={[...who.map((id) => ({ id, label: id === me ? "Me"
          : p.nameOf(id) })), { id: "company", label: "Holidays" },
        { id: "pay", label: "Pay dates" }]}
        events={events} onMonth={(step) => setMonth(shift(month, step))} />
      <div className={tpl.page}>
        {list.length === 0 ? <p>Nothing is planned this month.</p> : (
          <History items={list.map((e) => ({ text: e.rowId === me ||
            e.rowId === "company" || e.rowId === "pay" ? e.label
            : `${p.nameOf(e.rowId)}: ${e.label}`,
          when: e.start === e.end ? p.when(e.start)
            : `${p.when(e.start)} to ${p.when(e.end)}`,
          tone: e.tone === "booked" ? "ok" : e.tone === "waiting" ? "warn"
            : "info" }))} />
        )}
      </div>
    </div>
  );
}
