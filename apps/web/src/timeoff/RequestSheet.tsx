import { useEffect, useId, useRef, useState } from "react";
import type { LeaveTypeId } from "../demo/data/people-types";
import { DUR, reducedMotion } from "../demo/motion";
import { useDemo } from "../demo/state";
import { annualNow, personFor, requestRows } from "../demo/time-off";
import { useLocale } from "../i18n/LocaleProvider";
import { dayCountText, dayVars, rangeText } from "../people/words";
import b from "../ui/button.module.css";
import { Icon } from "../ui/Icon";
import { useToast } from "../ui/Toast";
import { nextWeek, problemOf, YEAR } from "./draft";
import p from "../people/page.module.css";
import s from "./timeoff.module.css";

/**
 * Request time off for yourself: type, first and last day (the
 * engine counts working days as you choose), reason, an optional note,
 * and who it goes to. Sending adds a waiting request that lands in the
 * approver's inbox on Home and here.
 */
export function RequestSheet(q: { open: boolean; onClose(): void;
  onSent(id: string): void }) {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const ref = useRef<HTMLDialogElement>(null);
  const [leaving, setLeaving] = useState(false);
  const me = personFor(data, state.role);
  const first = nextWeek(data.people.asOf);
  const [type, setType] = useState<LeaveTypeId>("lt-annual");
  const [start, setStart] = useState(first.start);
  const [end, setEnd] = useState(first.end);
  const [reason, setReason] = useState("reason.travel");
  const [note, setNote] = useState("");
  const ids = { start: useId(), end: useId(), reason: useId(),
    note: useId(), title: useId(), type: useId(), sum: useId() };
  useEffect(() => {
    const d = ref.current;
    if (d === null) return;
    if (q.open && !d.open) {
      setLeaving(false);
      d.showModal();
    }
    if (!q.open && d.open) d.close();
  }, [q.open]);
  const close = (): void => {
    if (reducedMotion()) {
      q.onClose();
      return;
    }
    setLeaving(true);
    setTimeout(q.onClose, DUR.base);
  };
  const approver = data.people.person(data.people.approverOf(me));
  const count = end >= start && start !== "" && end !== ""
    ? data.people.countDays(start, end) : { halves: 0, weekendDays: 0 };
  const bal = annualNow(data, state, me);
  const taken = requestRows(data, state).filter((r) => r.employeeId === me
    && (r.state === "booked" || r.state === "waiting"));
  const problem = problemOf(type, start, end, count, bal, taken);
  const left = bal === null ? null : bal.availableDays - count.halves / 2;
  const send = (): void => {
    if (problem !== null || approver === null) return;
    const n = state.nextRequest;
    dispatch({ type: "request-leave", draft: { employeeId: me,
      leaveTypeId: type, startDate: start, endDate: end,
      halves: count.halves, reasonKey: reason, note: note.trim(),
      requestedOn: data.people.asOf, checkerId: approver.id } });
    q.onSent(`lr-new-${n}`);
    toast.show(t("timeoff.sent", { name: approver.name[lang] }),
      () => dispatch({ type: "withdraw-leave", id: `lr-new-${n}` }));
    setNote("");
    close();
  };
  return (
    <dialog ref={ref} className={s.sheet} data-leaving={leaving}
      aria-labelledby={ids.title}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}>
      <form className={s.form} method="dialog" onSubmit={(e) => {
        e.preventDefault();
        send();
      }}>
        <header className={s.sheetHead}>
          <h2 id={ids.title} className={s.sheetTitle}>
            {t("timeoff.sheetTitle")}
          </h2>
          <button type="button" className={s.close} onClick={close}
            aria-label={t("timeoff.cancel")}>
            <Icon name="x" size={20} />
          </button>
        </header>
        <fieldset className={s.field}>
          <legend id={ids.type} className={s.label}>{t("timeoff.type")}
          </legend>
          <div className={s.segments}>
            {data.people.leaveTypes().map((x) => (
              <label key={x.id} className={s.segment}>
                <input type="radio" name="leave-type" value={x.id}
                  checked={type === x.id}
                  onChange={() => setType(x.id)} />
                <span>{x.name[lang]}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className={s.dates}>
          <div className={s.field}>
            <label htmlFor={ids.start} className={s.label}>
              {t("timeoff.firstDay")}
            </label>
            <input id={ids.start} type="date" className={s.input}
              value={start} required aria-describedby={ids.sum}
              min={`${YEAR}-01-01`} max={`${YEAR}-12-31`}
              onChange={(e) => {
                setStart(e.target.value);
                if (end < e.target.value) setEnd(e.target.value);
              }} />
          </div>
          <div className={s.field}>
            <label htmlFor={ids.end} className={s.label}>
              {t("timeoff.lastDay")}
            </label>
            <input id={ids.end} type="date" className={s.input}
              value={end} min={start} max={`${YEAR}-12-31`} required
              aria-describedby={ids.sum}
              onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <div id={ids.sum} className={s.summary} aria-live="polite"
          data-problem={problem !== null}>
          {problem === null ? (
            <>
              <p className={`${s.count} tabular`}>
                {t("timeoff.workingDays", dayVars(count.halves, lang))}
              </p>
              <p className={s.countRange}>{rangeText(start, end, lang)}</p>
              <p className={s.countSub}>
                {[count.weekendDays > 0 ? t("timeoff.weekendsSkipped",
                  { count: count.weekendDays }) : "",
                type === "lt-annual" && left !== null ? t(
                  "timeoff.afterThis", { days: dayCountText(left, t,
                    lang) }) : ""].filter((x) => x !== "").join(" · ")}
              </p>
            </>
          ) : (
            <p className={s.problem}>
              {t(`timeoff.${problem}`, { days: bal === null ? ""
                : dayCountText(bal.availableDays, t, lang) })}
            </p>
          )}
          <p className={s.countSub}>{t("timeoff.holidayNote")}</p>
        </div>
        <div className={s.field}>
          <label htmlFor={ids.reason} className={s.label}>
            {t("timeoff.reason")}
          </label>
          <select id={ids.reason} className={s.input} value={reason}
            onChange={(e) => setReason(e.target.value)}>
            {data.people.reasons().map((r) => (
              <option key={r.key} value={r.key}>{r.text[lang]}</option>
            ))}
          </select>
        </div>
        {approver !== null && (
          <div className={s.field}>
            <label htmlFor={ids.note} className={s.label}>
              {t("timeoff.note", { name: approver.name[lang]
                .split(" ")[0] ?? "" })}
            </label>
            <textarea id={ids.note} className={s.input} rows={2}
              value={note} maxLength={200}
              placeholder={t("timeoff.notePlaceholder")}
              onChange={(e) => setNote(e.target.value)} />
          </div>
        )}
        {approver !== null && (
          <p className={s.goesTo}>
            {t("timeoff.goesTo", { name: approver.name[lang],
              role: approver.role[lang] })}
          </p>
        )}
        <div className={s.sheetActions}>
          <button type="button" className={`${b.btn} ${b.secondary} ${p.tall}`}
            onClick={close}>{t("timeoff.cancel")}</button>
          <button type="submit" className={`${b.btn} ${b.primary} ${p.tall}`}
            disabled={problem !== null}>{t("timeoff.send")}</button>
        </div>
      </form>
    </dialog>
  );
}
