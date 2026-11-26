import { fils, type Fils } from "@payroll/engine";
import { useEffect, useRef, useState } from "react";
import { ExplainLink } from "../components/explain";
import type { Issue } from "../demo/data/types";
import { confirmations, isBlocking } from "../demo/derive";
import { reducedMotion } from "../demo/motion";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { IbanForm } from "../home/IbanForm";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import { Money } from "../ui/Money";
import { useToast } from "../ui/Toast";
import b from "../ui/button.module.css";
import { RollMoney } from "./Roll";
import s from "./PayRun.module.css";

/** Which explanation an issue points at, when there is one. */
function explainIdOf(i: Issue): string | null {
  if (i.employeeId === null) return null;
  if (i.code === "OVERTIME_DAILY_CAP_EXCEEDED") {
    return `overtime:${i.employeeId}`;
  }
  if (i.code === "DEDUCTION_DEFERRED") return `loan:${i.employeeId}`;
  if (i.code === "SETTLEMENT_PARTIAL") return `gratuity:${i.employeeId}`;
  return null;
}

/**
 * Source wording ("secondary-sourced, as we read it") belongs in the
 * explain panel only; the list keeps the plain sentence.
 */
export function plainOnly(text: string): string {
  return text.replace(/\s*\([^)]*(secondary|as we read)[^)]*\)/gi, "");
}

/**
 * The held amount flowing into the file: when held pay drops and the
 * file total rises, the difference travels from one to the other.
 */
function useFlow(held: Fils): { amount: Fils; n: number } | null {
  const last = useRef(held);
  const [flow, setFlow] = useState<{ amount: Fils; n: number } | null>(
    null);
  useEffect(() => {
    const was = last.current;
    last.current = held;
    if (held >= was || reducedMotion()) return undefined;
    setFlow((f) => ({ amount: fils(was - held), n: (f?.n ?? 0) + 1 }));
    const id = setTimeout(() => setFlow(null), 900);
    return () => clearTimeout(id);
  }, [held]);
  return flow;
}

type Kind = "stops" | "check" | "confirm" | "fixed";

const KIND_WORD = {
  stops: "payrun.kindStops", check: "payrun.kindCheck",
  confirm: "payrun.kindConfirm", fixed: "payrun.kindFixed",
} as const;

/** The row's kind: an 8 px dot that carries the colour, and a word. */
function KindTag(p: { kind: Kind }) {
  const { t } = useLocale();
  return (
    <span className={s.kind}>
      {p.kind === "fixed"
        ? <span className={s.kindIcon}><Icon name="check" size={14} /></span>
        : <span className={s.dot8} aria-hidden="true" data-tone={
          p.kind === "stops" ? "bad" : p.kind === "check" ? "warn"
            : "info"} />}
      {t(KIND_WORD[p.kind])}
    </span>
  );
}

/**
 * Step 2: one grouped list. What stops pay comes first (bank details:
 * entering an IBAN re-runs the real salary file check and the held pay
 * flows into the file), then what to check, then setup to confirm.
 * Each row says its kind once, as a dot and a word.
 */
export function FixStep() {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const h = data.headline();
  const issues = data.issues().filter((i) => i.kind === "issue");
  const blockers = issues.filter(isBlocking);
  const checks = issues.filter((i) => !isBlocking(i));
  const setup = confirmations(data);
  const fixed = Object.keys(state.ibans);
  const isHr = state.role === "hr";
  const flow = useFlow(h.heldNetFils);
  const open = checks.filter((i) => state.resolved[i.id] === undefined)
    .length;
  return (
    <section aria-labelledby="step-title" className={s.step}>
      <h2 id="step-title" className={s.stepTitle}>{t("payrun.fixTitle")}</h2>
      <p className={s.stepSub}>
        {isHr ? t("payrun.fixSub") : t("payrun.gmFixNote")}
      </p>

      <div className={s.fileNow} aria-live="polite">
        <span className={s.fileNowLabel}>{t("payrun.fileNow")}</span>
        <span className={s.fileNowFigure}>
          <RollMoney value={h.sifTotalFils} size="lg" />
          {flow !== null && (
            <span key={flow.n} className={s.flowChip} aria-hidden="true">
              <Money value={flow.amount} size="sm" signed tween={false} />
            </span>
          )}
        </span>
        <span className={s.fileNowMeta}>
          {t("payrun.fileLine", { count: h.sifPeople })},{" "}
          <RollMoney value={h.heldNetFils} size="sm" />{" "}
          {t("payrun.heldNow")}
        </span>
      </div>

      <section aria-labelledby="tofix-title" className={s.block}>
        <h3 id="tofix-title" className={s.groupTitle}>
          {t("payrun.fixListTitle")}
          <span className={s.groupCount}>
            {blockers.length === 0 ? t("payrun.fixNoStops")
              : t("payrun.fixStops", { count: blockers.length })},{" "}
            {open === 0 ? t("payrun.fixNoChecks")
              : t("payrun.fixChecks", { count: open })}
          </span>
        </h3>
        <ul className={s.group}>
          {blockers.map((i) => (
            <BlockerRow key={i.id} issue={i} canFix={isHr} />
          ))}
          {fixed.map((id) => (
            <li key={`fixed-${id}`} className={s.row} data-done="true">
              <span className={s.rowMain}>
                <KindTag kind="fixed" />
                <span className={s.name}>{t("payrun.fixedTitle")}
                  <span className={s.who}> · {data.employee(id)
                    .name[lang]}</span></span>
                <span className={s.reason}>{t("payrun.fixedIban",
                  { name: data.employee(id).name[lang] })}</span>
              </span>
            </li>
          ))}
          {blockers.length === 0 && fixed.length === 0 && (
            <li className={s.row}>
              <span className={s.rowMain}>
                <span className={s.reason}>{t("payrun.nothingToFix")}</span>
              </span>
            </li>
          )}
          {checks.map((i, n) => (
            <CheckRow key={i.id} issue={i} canAct={isHr} index={n} />
          ))}
          {setup.map((i) => (
            <li key={i.id} className={s.row}>
              <span className={s.rowMain}>
                <KindTag kind="confirm" />
                <span className={s.name}>{i.title[lang]}</span>
                <span className={s.reason}>{i.reason[lang]}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}

function BlockerRow(p: { issue: Issue; canFix: boolean }) {
  const { lang, t } = useLocale();
  const { data, dispatch } = useDemo();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const i = p.issue;
  const name = i.employeeId === null ? ""
    : data.employee(i.employeeId).name[lang];
  return (
    <li className={s.row} id={`fix-${i.id}`} data-open={open}>
      <span className={s.rowMain}>
        <KindTag kind="stops" />
        <span className={s.name}>{i.title[lang]}
          <span className={s.who}> · {name}</span></span>
        <span className={s.reasonMain}>{plainOnly(i.reason[lang])}</span>
        <span className={s.reason}>{i.suggestedFix[lang]}</span>
      </span>
      {p.canFix && i.employeeId !== null && !open && (
        <span className={s.rowAction}>
          <button type="button"
            className={`${b.btn} ${b.secondary} ${s.act}`}
            onClick={() => setOpen(true)}>{t("payrun.enterIban")}</button>
        </span>
      )}
      {p.canFix && i.employeeId !== null && open && (
        <span className={s.rowForm}>
          <IbanForm employeeId={i.employeeId} name={name}
            onCancel={() => setOpen(false)}
            onSave={(value) => {
              dispatch({ type: "iban", employeeId: i.employeeId!, value });
              toast.show(t("payrun.fixedIban", { name }), () =>
                dispatch({ type: "unset-iban",
                  employeeId: i.employeeId! }));
            }} />
        </span>
      )}
    </li>
  );
}

function CheckRow(p: { issue: Issue; canAct: boolean; index: number }) {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const d = useRunDetail();
  const i = p.issue;
  const done = state.resolved[i.id];
  const ex = explainIdOf(i);
  const name = i.employeeId === null ? ""
    : data.employee(i.employeeId).name[lang];
  return (
    <li className={s.row} data-done={done !== undefined}
      style={{ "--i": Math.min(p.index, 8) } as object}>
      <span className={s.rowMain}>
        <KindTag kind={done !== undefined ? "fixed" : "check"} />
        <span className={s.name}>{i.title[lang]}
          {name !== "" && <span className={s.who}> · {name}</span>}</span>
        <span className={s.reasonMain}>{plainOnly(i.reason[lang])}</span>
        <span className={s.reason}>{i.suggestedFix[lang]}</span>
        {ex !== null && (
          <span>
            <ExplainLink explanation={d.explain[ex]} className={s.rowLink}>
              {t("payrun.howWorked")}
            </ExplainLink>
          </span>
        )}
      </span>
      <span className={s.rowAction}>
        {done !== undefined ? (
          <>
            <span className={s.doneWord}>
              {done === "renewal" ? t("payrun.renewalStarted")
                : t("payrun.reviewed")}
            </span>
            {p.canAct && (
              <button type="button" className={`${b.btn} ${b.quiet} ${s.act}`}
                onClick={() => dispatch({ type: "reopen", id: i.id })}>
                {t("payrun.reopen")}
              </button>
            )}
          </>
        ) : p.canAct && (
          <button type="button"
            className={`${b.btn} ${b.secondary} ${s.act}`}
            onClick={() => dispatch({ type: "resolve", id: i.id,
              how: i.fixKind === "renew-document" ? "renewal"
                : "reviewed" })}>
            {i.fixKind === "renew-document" ? t("payrun.startRenewal")
              : t("payrun.markReviewed")}
          </button>
        )}
      </span>
    </li>
  );
}
