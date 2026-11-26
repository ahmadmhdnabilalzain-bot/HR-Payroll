import { useEffect, useRef, useState } from "react";
import type { Issue, IssueKind, Severity } from "../demo/data/types";
import { useDemo, type Resolution } from "../demo/state";
import type { MessageKey } from "../i18n/t";
import { useLocale } from "../i18n/LocaleProvider";
import b from "../ui/button.module.css";
import { Icon } from "../ui/Icon";
import { useToast } from "../ui/Toast";
import { IbanForm } from "./IbanForm";
import s from "./IssueList.module.css";

const SEVERITY: Record<Severity, MessageKey> = {
  error: "home.sevError", warning: "home.sevWarning", info: "home.sevInfo",
};

const DONE: Record<Resolution, MessageKey> = {
  iban: "home.doneIban", deduction: "home.doneDeduction",
  hours: "home.doneHours", cap: "home.doneCap", change: "home.doneChange",
  renewal: "home.doneRenewal",
};

/** The one-click choices per kind (the IBAN takes a form instead). */
const CHOICES: Partial<Record<IssueKind, [Resolution, MessageKey][]>> = {
  "unpaid-leave": [["deduction", "home.confirmDays"]],
  "overtime-limit": [["hours", "home.acceptHours"],
    ["cap", "home.payToLimit"]],
  "salary-change": [["change", "home.confirmChange"]],
  "document-expiring": [["renewal", "home.startRenewal"]],
};

export function IssueRow(p: { issue: Issue }) {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const row = useRef<HTMLLIElement>(null);
  const i = p.issue;
  const who = data.employee(i.employeeId);
  const done = state.resolved[i.id];
  useEffect(() => {
    if (state.focusIssue !== i.id || row.current === null) return;
    row.current.scrollIntoView({ block: "center", behavior: "smooth" });
    row.current.focus({ preventScroll: true });
    dispatch({ type: "focus-issue", id: null });
  }, [state.focusIssue, i.id, dispatch]);
  const resolve = (how: Resolution): void => {
    dispatch({ type: "resolve", id: i.id, how });
    setEditing(false);
    toast.show(t(DONE[how], { name: who.name[lang] }),
      () => dispatch({ type: "reopen", id: i.id }));
  };
  if (done !== undefined) {
    return (
      <li className={s.row} data-flip={i.id} data-done="" ref={row}
        tabIndex={-1}>
        <span className={s.icon} data-tone="ok"><Icon name="check" /></span>
        <p className={s.doneText}>{t(DONE[done], { name: who.name[lang] })}</p>
        <button type="button" className={`${b.btn} ${b.quiet}`}
          onClick={() => dispatch({ type: "reopen", id: i.id })}>
          <Icon name="undo" size={14} />{t("home.undo")}
        </button>
      </li>
    );
  }
  const canAct = state.role === "hr";
  const choices = CHOICES[i.kind] ?? [];
  return (
    <li className={s.row} data-flip={i.id} ref={row} tabIndex={-1}>
      <span className={s.icon} data-tone={i.severity}>
        <Icon name={i.severity === "info" ? "info" : "alert"} />
      </span>
      <div className={s.body}>
        <div className={s.who}>
          <span className={s.name}>{who.name[lang]}</span>
          <span className={s.role}>{who.role[lang]}</span>
          <span className={s.sev} data-tone={i.severity}>
            {t(SEVERITY[i.severity])}
          </span>
        </div>
        <p className={s.reason}>{i.plainReason[lang]}</p>
        <p className={s.fix}>
          <span className={s.fixLabel}>{t("home.suggested")}</span>
          {i.suggestedFix[lang]}
        </p>
        {canAct && editing && (
          <IbanForm name={who.name[lang]} onCancel={() => setEditing(false)}
            onSave={() => resolve("iban")} />
        )}
      </div>
      {canAct && !editing && (
        <div className={s.actions}>
          {i.kind === "missing-iban" && (
            <button type="button" className={`${b.btn} ${b.primary}`}
              onClick={() => setEditing(true)}>{t("home.enterIban")}</button>
          )}
          {choices.map(([how, key], n) => (
            <button key={how} type="button" onClick={() => resolve(how)}
              className={`${b.btn} ${n === 0 ? b.primary : b.secondary}`}>
              {t(key)}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
