import { useLocale } from "../../i18n/LocaleProvider";
import { PageHead } from "./PageHead";
import s from "./templates.module.css";

export type CalTone = "booked" | "waiting" | "holiday" | "shift";

export interface CalEvent {
  rowId: string;
  /** ISO dates, inclusive. */
  start: string;
  end: string;
  tone: CalTone;
  label: string;
}

function daysOf(ym: string): string[] {
  const [y, m] = ym.split("-").map(Number);
  const n = new Date(Date.UTC(y ?? 0, m ?? 1, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) =>
    `${ym}-${String(i + 1).padStart(2, "0")}`);
}

const weekend = (iso: string): boolean => {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return d === 0 || d === 6;
};

/**
 * CA, calendar: a month grid with people (or anything) as rows, events
 * as marks per day. Weekends (Saturday, Sunday) are shaded. Month
 * changes are the builder's (pass `onMonth`).
 */
export function MonthCalendar(p: {
  title: string;
  lede?: string;
  month: string;
  monthLabel: string;
  rows: { id: string; label: string }[];
  events: CalEvent[];
  onMonth?(step: -1 | 1): void;
}) {
  const { t } = useLocale();
  const days = daysOf(p.month);
  const mark = (rowId: string, day: string): CalEvent | undefined =>
    p.events.find((e) => e.rowId === rowId && e.start <= day &&
      day <= e.end);
  return (
    <div className={s.page}>
      <PageHead title={p.title} lede={p.lede} actions={p.onMonth && (
        <div className={s.segments}>
          <button type="button" onClick={() => p.onMonth?.(-1)}>
            {t("tpl.prevMonth")}</button>
          <span className={s.monthLabel}>{p.monthLabel}</span>
          <button type="button" onClick={() => p.onMonth?.(1)}>
            {t("tpl.nextMonth")}</button>
        </div>
      )} />
      <div className={s.calScroll}>
        <table className={s.cal}>
          <thead>
            <tr>
              <th scope="col"><span className="visually-hidden">
                {t("tpl.who")}</span></th>
              {days.map((d) => (
                <th key={d} scope="col" data-weekend={weekend(d)}>
                  {Number(d.slice(8))}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.rows.map((r) => (
              <tr key={r.id}>
                <th scope="row">{r.label}</th>
                {days.map((d) => {
                  const e = mark(r.id, d);
                  return (
                    <td key={d} data-weekend={weekend(d)}
                      data-tone={e?.tone} title={e?.label}>
                      {e !== undefined && (
                        <span className="visually-hidden">{e.label}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
