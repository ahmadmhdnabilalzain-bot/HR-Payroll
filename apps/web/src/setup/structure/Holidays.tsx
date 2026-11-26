import { useState } from "react";
import { formatMonth } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import { MonthCalendar, type CalEvent } from "../../ui/templates";
import type { StructureData } from "./data";
import s from "./structure.module.css";
import { Rows, Status } from "./ui";

const shift = (ym: string, step: number): string => {
  const [y, m] = ym.split("-").map(Number);
  const at = (y ?? 0) * 12 + (m ?? 1) - 1 + step;
  return `${Math.floor(at / 12)}-${String(at % 12 + 1).padStart(2, "0")}`;
};

/** T07: public holidays on a month view. Sample dates only. */
export function Holidays(p: { d: StructureData }) {
  const { d } = p;
  const { lang } = useLocale();
  const first = d.holidays[0]!.from.slice(0, 7);
  const last = d.holidays.at(-1)!.to.slice(0, 7);
  const [month, setMonth] = useState((d.nextHoliday ?? d.holidays[0]!)
    .from.slice(0, 7));
  const events: CalEvent[] = d.holidays.map((h) => ({ rowId: "hol",
    start: h.from, end: h.to, tone: "holiday", label: h.name }));
  const step = (n: -1 | 1): void => {
    const to = shift(month, n);
    if (to >= first && to <= last) setMonth(to);
  };
  return (
    <div>
      <MonthCalendar title="Public holidays"
        lede="Sample dates, to follow the official announcement."
        month={month} monthLabel={formatMonth(month, lang)}
        rows={[{ id: "hol", label: "Public holiday" }]} events={events}
        onMonth={step} />
      <section className={s.below} aria-label="All holidays">
        <h2 className={s.sectionTitle}>The year</h2>
        <Rows label="All holidays" rows={d.holidays.map((h) => ({
          key: h.id, title: h.name,
          help: `${h.display.dates}, ${h.display.weekdays}`,
          value: (
            <Status tone={h.state === "upcoming" ? "ok" : "none"}>
              {h.display.when}. {h.display.workingDays}</Status>) }))} />
      </section>
    </div>
  );
}
