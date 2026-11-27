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
import { daysOf, nextWeek, plusDays, problemOf, YEAR, yearsBetween }
  from "./draft";
import p from "../people/page.module.css";
import s from "./timeoff.module.css";

/**
 * Request time off for yourself: type, first and last day (the
 * engine counts working days as you choose), reason, an optional note,
 * and who it goes to. Sending adds a waiting request that lands in the
 * approver's inbox on Home and here.
 */
const NO_DAYS = { halves: 0, weekendDays: 0, holidayDays: 0 };

export function RequestSheet(q: { open: boolean; onClose(): void;
  onSent(id: string): void;
  /** First and last day to start from, days after today (else the
   * next working week). */
  from?: [number, number] }) {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const ref = useRef<HTMLDialogElement>(null);
  const [leaving, setLeaving] = useState(false);
  const me = personFor(data, state.role);
  const asOf = data.people.asOf;
  const first = q.from === undefined ? nextWeek(asOf)
    : { start: plusDays(asOf, q.from[0]), end: plusDays(asOf, q.from[1]) };
  const [type, setType] = useState<LeaveTypeId>("lt-annual");
  const [start, setStart] = useState(first.start);
  const [end, setEnd] = useState(first.end);
  const [reason, setReason] = useState("reason.travel");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<string | null>(null);
  const ids = { start: useId(), end: useId(), reason: useId(),
    note: useId(), title: useId(), type: useId(), sum: useId(),
    rule: useId() };
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
  const hr = data.people.person(data.people.personas().hrId);
  const types = data.people.leaveTypes();
  const kind = types.find((x) => x.id === type) ?? types[0];
  const rule = kind?.rule;
  const joined = data.people.person(me)?.joinedOn ?? asOf;
  const count = end >= start && start !== "" && end !== ""
    ? data.people.countDays(start, end) : NO_DAYS;
  const bal = annualNow(data, state, me);
  const taken = requestRows(data, state).filter((r) => r.employeeId === me
    && (r.state === "booked" || r.state === "waiting"));
  const check = (proofAdded: boolean) => problemOf(type, start, end, count,
    bal, taken, rule === undefined ? undefined : { rule, proofAdded,
      serviceYears: yearsBetween(joined, asOf) });
  // A missing file holds Send back; the file row says what it needs,
  // so the summary only shows the other problems.
  const problem = check(true);
  const blocked = check(file !== null) !== null;
  const used = rule === undefined || start === "" || end === "" ||
    end < start ? 0 : daysOf(rule, start, end, count);
  const short = rule !== undefined && rule.noticeDays > 0 &&
    start !== "" && start < plusDays(asOf, rule.noticeDays);
  const left = bal === null ? null : bal.availableDays - count.halves / 2;
  const send = (): void => {
    if (blocked || approver === null) return;
    const n = state.nextRequest;
    dispatch({ type: "request-leave", draft: { employeeId: me,
      leaveTypeId: type, startDate: start, endDate: end,
      halves: count.halves, reasonKey: reason, note: note.trim(),
      ...(file === null ? {} : { files: [file] }),
      requestedOn: asOf, checkerId: approver.id } });
    q.onSent(`lr-new-${n}`);
    toast.show(t("timeoff.sent", { name: approver.name[lang] }),
      () => dispatch({ type: "withdraw-leave", id: `lr-new-${n}` }));
    setNote("");
    setFile(null);
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
        <div className={s.field}>
          <label htmlFor={ids.type} className={s.label}>
            {t("timeoff.type")}
          </label>
          <select id={ids.type} className={s.input} value={type}
            aria-describedby={ids.rule}
            onChange={(e) => {
              setType(e.target.value as LeaveTypeId);
              setFile(null);
            }}>
            {types.map((x) => (
              <option key={x.id} value={x.id}>{x.name[lang]}</option>
            ))}
          </select>
          {rule !== undefined && (
            <div id={ids.rule} className={s.rule}>
              <p>{rule.text[lang]}</p>
              {rule.proof !== null && (
                <p>{t("timeoff.ruleProof", { proof: rule.proof[lang] })}</p>
              )}
              <p className={s.countSub}>{rule.source[lang]}</p>
            </div>
          )}
        </div>
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
                {rule?.basis === "calendar" ? t("timeoff.calendarDays",
                  dayVars(used * 2, lang))
                  : t("timeoff.workingDays", dayVars(count.halves, lang))}
              </p>
              <p className={s.countRange}>{rangeText(start, end, lang)}</p>
              <p className={s.countSub}>
                {[count.weekendDays > 0 && rule?.basis !== "calendar"
                  ? t("timeoff.weekendsSkipped",
                  { count: count.weekendDays }) : "",
                count.holidayDays > 0 && rule?.basis !== "calendar"
                  ? t("timeoff.holidaysSkipped",
                  { count: count.holidayDays }) : "",
                type === "lt-annual" && left !== null ? t(
                  "timeoff.afterThis", { days: dayCountText(left, t,
                    lang) }) : rule?.maxDays != null ? t("timeoff.afterThis",
                  { days: dayCountText(rule.maxDays - used, t, lang) })
                  : ""].filter((x) => x !== "").join(" · ")}
              </p>
              {short && (
                <p className={s.countSub}>{t("timeoff.shortNotice",
                  { days: rule?.noticeDays ?? 0 })}</p>
              )}
            </>
          ) : (
            <p className={s.problem}>
              {t(`timeoff.${problem}`, { days: problem === "errMax"
                ? dayCountText(rule?.maxDays ?? 0, t, lang) : bal === null
                  ? "" : dayCountText(bal.availableDays, t, lang),
              type: kind?.name[lang] ?? "",
              years: rule?.minServiceYears ?? 0,
              proof: rule?.proof?.[lang] ?? "" })}
            </p>
          )}
          {rule?.basis !== "calendar" && (
            <p className={s.countSub}>{t("timeoff.holidayNote")}</p>
          )}
        </div>
        {rule?.proof != null && (
          <div className={s.field}>
            <span className={s.label}>{rule.proof[lang]}</span>
            {file === null ? (
              <button type="button" className={`${b.btn} ${b.secondary}
                ${p.tall}`} onClick={() => setFile(rule.proofFile ??
                  "file.pdf")}>
                <Icon name="file" size={18} />
                {t("timeoff.attach")}
              </button>
            ) : (
              <p className={s.chip}>
                <Icon name="file" size={18} />
                <span className={s.chipText}>
                  <span dir="ltr">{file}</span>
                  <span className={s.countSub}>
                    {t("timeoff.attachSample")}</span>
                </span>
                <button type="button" className={s.close}
                  aria-label={t("timeoff.removeFile", { file })}
                  onClick={() => setFile(null)}>
                  <Icon name="x" size={18} />
                </button>
              </p>
            )}
          </div>
        )}
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
            {hr === null || hr.id === approver.id
              ? t("timeoff.goesTo", { name: approver.name[lang],
                role: approver.role[lang] })
              : t("timeoff.goesChain", { manager: approver.name[lang],
                role: approver.role[lang], hr: hr.name[lang] })}
          </p>
        )}
        <div className={s.sheetActions}>
          <button type="button" className={`${b.btn} ${b.secondary} ${p.tall}`}
            onClick={close}>{t("timeoff.cancel")}</button>
          <button type="submit" className={`${b.btn} ${b.primary} ${p.tall}`}
            disabled={blocked}>{t("timeoff.send")}</button>
        </div>
      </form>
    </dialog>
  );
}
