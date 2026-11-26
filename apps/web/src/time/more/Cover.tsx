import { useState } from "react";
import type { CalEvent } from "../../ui/templates";
import { useDemo } from "../../demo/state";
import { useLocale } from "../../i18n/LocaleProvider";
import { Field, useNames } from "../../people/files/common";
import f from "../../people/files/files.module.css";
import b from "../../ui/button.module.css";
import { Money } from "../../ui/Money";
import { MonthCalendar } from "../../ui/templates";
import t from "../../ui/templates/templates.module.css";
import { M } from "./words";

const W = M.cover;

/** T23: leave on the November calendar, and the cost of cover. */
export function Cover() {
  const { data } = useDemo();
  const { lang } = useLocale();
  const names = useNames();
  const people = data.people.people().filter((x) => x.status !== "left" &&
    x.status !== "joining");
  const [who, setWho] = useState(people[0]?.id ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [extra, setExtra] = useState<{ employeeId: string; from: string;
    to: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const base = data.files.cover.leave();
  const check = data.files.cover.check(extra ?? undefined);
  const events: CalEvent[] = base.map((l) => ({ rowId: l.employeeId,
    start: l.from, end: l.to, tone: l.waiting ? "waiting" : "booked",
    label: l.waiting ? "Leave, waiting" : "Leave" }));
  if (extra !== null) {
    events.push({ rowId: extra.employeeId, start: extra.from,
      end: extra.to, tone: "waiting", label: W.trying });
  }
  const ids = [...new Set(events.map((e) => e.rowId))];
  return (
    <>
      <MonthCalendar title={W.title} lede={`${W.lede} ${data.files.cover.note}`}
        month="2026-11" monthLabel={W.month}
        rows={ids.map((id) => ({ id, label: names.name(id) }))}
        events={events} />
      <section className={f.after} aria-label={W.check}>
        <h2 className={f.title}>{W.check}</h2>
        <form className={`${t.form} ${f.panel}`} onSubmit={(e) => {
          e.preventDefault();
          if (from === "" || to === "") return setError(W.needDates);
          if (to < from) return setError(W.order);
          setError(null);
          setExtra({ employeeId: who, from, to });
        }}>
          <Field label={W.person}>
            <select value={who} onChange={(e) => setWho(e.target.value)}>
              {people.map((x) => (
                <option key={x.id} value={x.id}>{x.name[lang]}</option>))}
            </select>
          </Field>
          <Field label={W.from}>
            <input type="date" value={from} min="2026-11-01" max="2026-11-30"
              onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={W.to}>
            <input type="date" value={to} min="2026-11-01" max="2026-11-30"
              onChange={(e) => setTo(e.target.value)} />
          </Field>
          {error !== null && <p className={t.error} role="alert">{error}</p>}
          <div className={t.formActions}>
            <button type="submit" className={`${b.btn} ${b.primary}`}>
              {W.go}</button>
          </div>
        </form>
        <h2 className={f.title}>{W.result}</h2>
        <p className={f.hint} role="status">{check.summary}</p>
        {check.days.length > 0 && (
          <ul className={f.group}>
            {check.days.map((d) => (
              <li key={`${d.date.iso}${d.team}`}>
                <span className={f.stack}>
                  <span>{d.date.display}, {d.team}</span>
                  <small>{W.onShift} {d.onShift}, {W.minimum} {d.minimum}.
                    {" "}{d.who}</small></span>
                <Money value={d.cost} size="sm" /></li>))}
            <li><strong>{W.total}</strong>
              <Money value={check.total} size="sm" /></li>
          </ul>)}
      </section>
    </>
  );
}
