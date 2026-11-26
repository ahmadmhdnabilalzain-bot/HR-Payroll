import { useState } from "react";
import { MonthCalendar, type CalEvent } from "../../ui/templates";
import { History } from "./History";
import { visaRows } from "./model";
import c from "./papers.module.css";
import { usePapers } from "./usePapers";

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const shift = (ym: string, step: number): string => {
  const [y, m] = ym.split("-").map(Number);
  const at = (y ?? 0) * 12 + (m ?? 1) - 1 + step;
  return `${String(Math.floor(at / 12))}-${String(at % 12 + 1)
    .padStart(2, "0")}`;
};

/** P51: due dates in one month: pay dates, expiries, case steps. */
export function Calendar() {
  const p = usePapers();
  const [month, setMonth] = useState(p.data.papers.asOf.slice(0, 7));
  const pay = p.data.payCalendar();
  const ev = (rowId: string, date: string, tone: CalEvent["tone"],
    label: string): CalEvent => ({ rowId, start: date, end: date, tone,
    label });
  const events: CalEvent[] = [
    ev("pay", pay.cutOff, "shift", "Cut-off"),
    ev("pay", pay.approveBy, "shift", "Approve by"),
    ev("pay", pay.sifDue, "shift", "Salary file due"),
    ev("pay", pay.payday, "shift", "Payday"),
    ...p.data.documents().map((x) => ev("docs", x.expiresOn, "waiting",
      `${x.kind[p.lang]}: ${p.nameOf(x.employeeId)}`)),
    ...visaRows(p.data, p.state).flatMap((v) => v.stages
      .filter((g) => g.date !== null).map((g) => ev("cases", g.date ?? "",
        g.done ? "booked" : "waiting",
        `${g.label}: ${p.nameOf(v.employeeId)}`))),
  ];
  const [y, m] = month.split("-");
  const inMonth = events.filter((e) => e.start.startsWith(month))
    .sort((a, b) => a.start.localeCompare(b.start));
  return (
    <>
    <MonthCalendar title="Compliance calendar"
      lede="Pay dates (sample dates), document expiries and the booked
        steps of visa cases."
      month={month} monthLabel={`${MONTHS[Number(m) - 1] ?? ""} ${y ?? ""}`}
      rows={[{ id: "pay", label: "Pay dates" },
        { id: "docs", label: "Documents expire" },
        { id: "cases", label: "Case steps" }]}
      events={events} onMonth={(step) => setMonth(shift(month, step))} />
    <div className={c.page}>
      {inMonth.length === 0 ? <p className={c.empty}>
        Nothing is due this month.</p> : (
        <History items={inMonth.map((e) => ({ text: e.label,
          when: p.when(e.start), tone: e.tone === "booked" ? "ok"
            : e.tone === "waiting" ? "warn" : "info" }))} />
      )}
    </div>
    </>
  );
}
