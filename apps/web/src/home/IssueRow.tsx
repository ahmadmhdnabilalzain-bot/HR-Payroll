import { useEffect, useRef, useState } from "react";
import type { FixKind, Issue } from "../demo/data/types";
import { useMaskText } from "../ui/mask";
import { useDemo, type Resolution } from "../demo/state";
import type { MessageKey } from "../i18n/t";
import { useLocale } from "../i18n/LocaleProvider";
import b from "../ui/button.module.css";
import { Icon } from "../ui/Icon";
import { useToast } from "../ui/Toast";
import { IbanForm } from "./IbanForm";
import { useIbanFlight } from "./useIbanFlight";
import { useSaveIban } from "./useSaveIban";
import s from "./IssueList.module.css";

const DONE: Record<Resolution, MessageKey> = {
  reviewed: "home.doneReviewed", renewal: "home.doneRenewal",
};

/** The one-tap step per fix kind (an IBAN takes the form instead). */
const ONE_TAP: Partial<Record<FixKind, [Resolution, MessageKey]>> = {
  review: ["reviewed", "home.markReviewed"],
  "renew-document": ["renewal", "home.startRenewal"],
};

/** One issue: a short title, one plain sentence, one next step. */
export function IssueRow(p: { issue: Issue; delay: number | null }) {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const row = useRef<HTMLLIElement>(null);
  const i = p.issue;
  const who = i.employeeId === null ? null : data.employee(i.employeeId);
  const name = who?.name[lang] ?? "";
  useEffect(() => {
    if (state.focusIssue !== i.id || row.current === null) return;
    row.current.scrollIntoView({ block: "center", behavior: "smooth" });
    if (i.fixKind === "enter-iban") setEditing(true);
    else row.current.focus({ preventScroll: true });
    dispatch({ type: "focus-issue", id: null });
  }, [state.focusIssue, i.id, i.fixKind, dispatch]);
  const settle = (how: Resolution): void => {
    dispatch({ type: "resolve", id: i.id, how });
    toast.show(t(DONE[how], { name }),
      () => dispatch({ type: "reopen", id: i.id }));
  };
  const save = useSaveIban();
  const flight = useIbanFlight();
  // Saved and in flight: the form closes and no action shows.
  const [flying, setFlying] = useState(false);
  // The pay it releases flies up into the salary-file total first.
  const saveIban = (value: string): void => {
    const id = i.employeeId ?? "";
    const from = row.current?.querySelector("input") ?? null;
    flight({ from, id, value, finish: () => save(id, value) });
    setFlying(true);
    setEditing(false);
  };
  const step = ONE_TAP[i.fixKind];
  const mask = useMaskText();
  const canAct = state.role === "hr" && i.employeeId !== null;
  return (
    <li className={s.row} data-flip={i.id} ref={row} tabIndex={-1}
      data-reveal={p.delay !== null ? "" : undefined}
      style={p.delay !== null ? { animationDelay: `${p.delay}ms` }
        : undefined}>
      <span className={s.icon} data-tone={i.severity}>
        <Icon name={i.severity === "info" ? "info" : "alert"} />
      </span>
      <div className={s.body}>
        <p className={s.titleRow}>
          <span className={s.name}>{i.title[lang]}</span>
        </p>
        <p className={s.reason}>{mask(i.reason[lang])}</p>
        {canAct && editing && (
          <IbanForm employeeId={i.employeeId ?? ""} name={name}
            onCancel={() => setEditing(false)} onSave={saveIban} />
        )}
      </div>
      {canAct && !editing && !flying && (
        <div className={s.actions}>
          {i.fixKind === "enter-iban" ? (
            <button type="button" className={`${b.btn} ${b.secondary}`}
              onClick={() => setEditing(true)}>{t("home.enterIban")}</button>
          ) : step !== undefined ? (
            <button type="button" className={`${b.btn} ${b.secondary}`}
              onClick={() => settle(step[0])}>{t(step[1])}</button>
          ) : null}
        </div>
      )}
    </li>
  );
}
