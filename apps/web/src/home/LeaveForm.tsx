import { useId, useState, type FormEvent } from "react";
import type { LeaveTypeId } from "../demo/data/people-types";
import { useDemo } from "../demo/state";
import { annualNow } from "../demo/time-off";
import { useLocale } from "../i18n/LocaleProvider";
import b from "../ui/button.module.css";
import { useToast } from "../ui/Toast";
import s from "./Self.module.css";

/** A civil date `days` after `iso` (no clock, no zone). */
function plusDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, (d ?? 1) + days))
    .toISOString().slice(0, 10);
}

/**
 * Request leave inline on the employee's Home. The working days come
 * from the engine (countDays), the balance check from the engine's
 * annual balance, and the request lands in the approver's inbox
 * through the shared store ("request-leave").
 */
export function LeaveForm(p: { employeeId: string; onDone(): void }) {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const id = useId();
  const asOf = data.people.asOf;
  const types = data.people.leaveTypes();
  const reasons = data.people.reasons();
  const [type, setType] = useState<LeaveTypeId>("lt-annual");
  const [from, setFrom] = useState(plusDays(asOf, 20));
  const [to, setTo] = useState(plusDays(asOf, 21));
  const [reason, setReason] = useState(reasons[0]?.key ?? "");
  const [error, setError] = useState<string | null>(null);
  const count = data.people.countDays(from, to <= from ? from : to);
  const days = count.halves / 2;
  const left = annualNow(data, state, p.employeeId)?.availableDays ?? 0;
  const approver = data.people.person(data.people.approverOf(
    p.employeeId));
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    if (to < from) return setError(t("timeoff.errEnd"));
    if (count.halves === 0) return setError(t("timeoff.errNone"));
    if (type === "lt-annual" && days > left) {
      return setError(t("timeoff.errOver", { days: String(left) }));
    }
    dispatch({ type: "request-leave", draft: { employeeId: p.employeeId,
      leaveTypeId: type, startDate: from, endDate: to,
      halves: count.halves, reasonKey: reason, note: "",
      requestedOn: asOf, checkerId: approver?.id ?? "" } });
    toast.show(t("timeoff.sent", { name: approver?.name[lang] ?? "" }));
    p.onDone();
  };
  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <div className={s.fields}>
        <label className={s.field}>
          <span>{t("timeoff.type")}</span>
          <select value={type} onChange={(e) => {
            setType(e.target.value as LeaveTypeId);
            setError(null);
          }}>
            {types.map((x) => <option key={x.id} value={x.id}>
              {x.name[lang]}</option>)}
          </select>
        </label>
        <label className={s.field}>
          <span>{t("timeoff.firstDay")}</span>
          <input type="date" value={from} min={asOf} onChange={(e) => {
            setFrom(e.target.value);
            setError(null);
          }} />
        </label>
        <label className={s.field}>
          <span>{t("timeoff.lastDay")}</span>
          <input type="date" value={to} min={from} onChange={(e) => {
            setTo(e.target.value);
            setError(null);
          }} />
        </label>
        <label className={s.field}>
          <span>{t("timeoff.reason")}</span>
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            {reasons.map((x) => <option key={x.key} value={x.key}>
              {x.text[lang]}</option>)}
          </select>
        </label>
      </div>
      <p id={`${id}-sum`} className={error === null ? s.sum : s.error}
        role={error === null ? undefined : "alert"}>
        {error ?? [t("timeoff.workingDays", { count: days,
          n: String(days) }),
        approver === null ? "" : t("timeoff.goesTo", {
          name: approver.name[lang], role: approver.role[lang] })]
          .filter(Boolean).join(" · ")}
      </p>
      <div className={s.formActions}>
        <button type="submit" className={`${b.btn} ${b.primary}`}
          aria-describedby={`${id}-sum`}>{t("timeoff.send")}</button>
        <button type="button" className={`${b.btn} ${b.quiet}`}
          onClick={p.onDone}>{t("timeoff.cancel")}</button>
      </div>
    </form>
  );
}
