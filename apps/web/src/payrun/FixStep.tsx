import { useState } from "react";
import { ExplainLink } from "../components/explain";
import type { Issue } from "../demo/data/types";
import { confirmations, isBlocking, notes } from "../demo/derive";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { IbanForm } from "../home/IbanForm";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import { Money } from "../ui/Money";
import { useToast } from "../ui/Toast";
import b from "../ui/button.module.css";
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
 * Step 2: the real problems, each with its plain reason and next step.
 * Entering an IBAN re-runs the real salary file check: the held pay
 * joins the file, the counts drop and the steps move on.
 */
export function FixStep() {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const h = data.headline();
  const issues = data.issues().filter((i) => i.kind === "issue");
  const blockers = issues.filter(isBlocking);
  const checks = issues.filter((i) => !isBlocking(i));
  const setup = [...confirmations(data), ...notes(data)];
  const fixed = Object.keys(state.ibans);
  const isHr = state.role === "hr";
  return (
    <section aria-labelledby="step-title" className={s.step}>
      <h2 id="step-title" className={s.stepTitle}>{t("payrun.fixTitle")}</h2>
      <p className={s.stepSub}>
        {isHr ? t("payrun.fixSub") : t("payrun.gmFixNote")}
      </p>

      <div className={s.fileNow} aria-live="polite">
        <span className={s.fileNowLabel}>{t("payrun.fileNow")}</span>
        <span className={s.fileNowFigure}>
          <Money value={h.sifTotalFils} size="lg" />
        </span>
        <span className={s.fileNowMeta}>
          {t("payrun.fileLine", { count: h.sifPeople })},{" "}
          <Money value={h.heldNetFils} size="sm" /> {t("payrun.heldNow")}
        </span>
      </div>

      <section aria-labelledby="tofix-title" className={s.block}>
        <h3 id="tofix-title" className={s.blockTitle}>
          {t("payrun.toFixTitle")}
        </h3>
        <p className={s.blockSub}>{t("payrun.toFixSub")}</p>
        <ul className={s.cards}>
          {blockers.map((i) => (
            <BlockerCard key={i.id} issue={i} canFix={isHr} />
          ))}
          {fixed.map((id) => (
            <li key={`fixed-${id}`} className={`${s.card} ${s.cardDone}`}>
              <p className={s.cardHead}>
                <span className={s.status} data-tone="ok">
                  <Icon name="check" size={16} />
                  {t("payrun.fixedTitle")}
                </span>
              </p>
              <p className={s.cardReason}>
                {t("payrun.fixedIban",
                  { name: data.employee(id).name[lang] })}
              </p>
            </li>
          ))}
        </ul>
        {blockers.length === 0 && (
          <p className={s.allGood}>
            <Icon name="check" size={18} />{t("payrun.nothingToFix")}
          </p>
        )}
      </section>

      <section aria-labelledby="checks-title" className={s.block}>
        <h3 id="checks-title" className={s.blockTitle}>
          {t("payrun.checksTitle")}
        </h3>
        <p className={s.blockSub}>{t("payrun.checksSub")}</p>
        <ul className={s.cards}>
          {checks.map((i, n) => (
            <CheckCard key={i.id} issue={i} canAct={isHr} index={n} />
          ))}
        </ul>
      </section>

      {setup.length > 0 && (
        <section aria-labelledby="setup-title" className={s.block}>
          <h3 id="setup-title" className={s.blockTitle}>
            {t("payrun.setupTitle")}
          </h3>
          <ul className={s.quietList}>
            {setup.map((i) => (
              <li key={i.id}>
                <span className={s.name}>{i.title[lang]}</span>
                <span className={s.reason}>{i.reason[lang]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

function BlockerCard(p: { issue: Issue; canFix: boolean }) {
  const { lang, t } = useLocale();
  const { data, dispatch } = useDemo();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const i = p.issue;
  const name = i.employeeId === null ? ""
    : data.employee(i.employeeId).name[lang];
  return (
    <li className={s.card} data-tone="bad" id={`fix-${i.id}`}>
      <p className={s.cardHead}>
        <span className={s.status} data-tone="bad">
          <span className={s.pip} aria-hidden="true" />
          {i.title[lang]}
        </span>
        <span className={s.cardWho}>{name}</span>
      </p>
      <p className={s.cardReason}>{i.reason[lang]}</p>
      <p className={s.cardFix}>
        <span className={s.cardFixLabel}>{t("payrun.suggested")}</span>
        {i.suggestedFix[lang]}
      </p>
      {p.canFix && i.employeeId !== null && (open ? (
        <IbanForm employeeId={i.employeeId} name={name}
          onCancel={() => setOpen(false)}
          onSave={(value) => {
            dispatch({ type: "iban", employeeId: i.employeeId!, value });
            toast.show(t("payrun.fixedIban", { name }), () =>
              dispatch({ type: "unset-iban", employeeId: i.employeeId! }));
          }} />
      ) : (
        <div className={s.cardActions}>
          <button type="button" className={`${b.btn} ${b.primary} ${s.act}`}
            onClick={() => setOpen(true)}>{t("payrun.enterIban")}</button>
        </div>
      ))}
    </li>
  );
}

function CheckCard(p: { issue: Issue; canAct: boolean; index: number }) {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const d = useRunDetail();
  const i = p.issue;
  const done = state.resolved[i.id];
  const ex = explainIdOf(i);
  const name = i.employeeId === null ? ""
    : data.employee(i.employeeId).name[lang];
  return (
    <li className={s.card} data-done={done !== undefined}
      style={{ "--i": Math.min(p.index, 8) } as object}>
      <p className={s.cardHead}>
        <span className={s.status}
          data-tone={done !== undefined ? "ok" : "warn"}>
          <span className={s.pip} aria-hidden="true" />
          {i.title[lang]}
        </span>
        <span className={s.cardWho}>{name}</span>
      </p>
      <p className={s.cardReason}>{i.reason[lang]}</p>
      <p className={s.cardFix}>
        <span className={s.cardFixLabel}>{t("payrun.suggested")}</span>
        {i.suggestedFix[lang]}
      </p>
      <div className={s.cardActions}>
        {ex !== null && (
          <ExplainLink explanation={d.explain[ex]}>
            {t("payrun.howWorked")}
          </ExplainLink>
        )}
        {done !== undefined ? (
          <>
            <span className={s.doneWord}>
              <Icon name="check" size={16} />
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
      </div>
    </li>
  );
}
