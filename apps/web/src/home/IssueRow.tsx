import { useEffect, useRef, useState } from "react";
import type { FixKind, Issue, Severity } from "../demo/data/types";
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
  "needs-confirmation": "home.sevConfirm",
};

const DONE: Record<Resolution, MessageKey> = {
  iban: "home.doneIban", reviewed: "home.doneReviewed",
  renewal: "home.doneRenewal",
};

/** The one-click step per fix kind (the IBAN takes a form instead). */
const ONE_CLICK: Partial<Record<FixKind, [Resolution, MessageKey]>> = {
  review: ["reviewed", "home.markReviewed"],
  "renew-document": ["renewal", "home.startRenewal"],
};

function useWho(i: Issue): string {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  return i.employeeId === null ? t("home.wholeRun")
    : data.employee(i.employeeId).name[lang];
}

export function IssueRow(p: { issue: Issue }) {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const row = useRef<HTMLLIElement>(null);
  const i = p.issue;
  const name = useWho(i);
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
    toast.show(t(DONE[how], { name }),
      () => dispatch({ type: "reopen", id: i.id }));
  };
  if (done !== undefined) {
    return (
      <li className={s.row} data-flip={i.id} data-done="" ref={row}
        tabIndex={-1}>
        <span className={s.icon} data-tone="ok"><Icon name="check" /></span>
        <p className={s.doneText}>{t(DONE[done], { name })}</p>
        <button type="button" className={`${b.btn} ${b.quiet}`}
          onClick={() => dispatch({ type: "reopen", id: i.id })}>
          <Icon name="undo" size={14} />{t("home.undo")}
        </button>
      </li>
    );
  }
  const role = i.employeeId === null ? null
    : data.employee(i.employeeId).role[lang];
  const canAct = state.role === "hr";
  const step = ONE_CLICK[i.fixKind];
  return (
    <li className={s.row} data-flip={i.id} ref={row} tabIndex={-1}>
      <span className={s.icon} data-tone={i.severity}>
        <Icon name={i.severity === "error" || i.severity === "warning"
          ? "alert" : "info"} />
      </span>
      <div className={s.body}>
        <div className={s.who}>
          <span className={s.name}>{name}</span>
          {role !== null && <span className={s.role}>{role}</span>}
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
          <IbanForm name={name} onCancel={() => setEditing(false)}
            onSave={() => resolve("iban")} />
        )}
      </div>
      {canAct && !editing && (i.fixKind === "enter-iban" || step) && (
        <div className={s.actions}>
          {i.fixKind === "enter-iban" ? (
            <button type="button" className={`${b.btn} ${b.primary}`}
              onClick={() => setEditing(true)}>{t("home.enterIban")}</button>
          ) : step !== undefined && (
            <button type="button" className={`${b.btn} ${b.secondary}`}
              onClick={() => resolve(step[0])}>{t(step[1])}</button>
          )}
        </div>
      )}
    </li>
  );
}
