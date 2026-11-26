import { Suspense, useState } from "react";
import { ExplainLink } from "../components/explain";
import { useRunApproval } from "../demo/actions";
import { DUR, reducedMotion } from "../demo/motion";
import { hrefOf, navigate } from "../demo/route";
import { useDemo } from "../demo/state";
import { useRunDetail } from "../demo/useRunDetail";
import { formatDayMonth, formatMonth } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import type { ViewProps } from "../views";
import { ApproveStep } from "./ApproveStep";
import { FixStep } from "./FixStep";
import {
  progress,
  STEP_LABEL,
  stepOf,
  STEPS,
  stepStates,
  type StepId,
  type StepState,
} from "./model";
import { PayStep } from "./PayStep";
import { ReviewStep } from "./ReviewStep";
import s from "./PayRun.module.css";

/** Moves to a step: the page fades out (200 ms), the next one in. */
export function useGoStep(): [boolean, (to: StepId) => void] {
  const [leaving, setLeaving] = useState(false);
  const go = (to: StepId): void => {
    if (reducedMotion()) {
      navigate("pay-run", to);
      return;
    }
    setLeaving(true);
    setTimeout(() => {
      navigate("pay-run", to);
      setLeaving(false);
    }, DUR.base);
  };
  return [leaving, go];
}

/** The pay run in four labelled steps: Review, Fix, Approve, Pay. */
export function PayRun(p: ViewProps) {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const step = stepOf(p.rest);
  const h = data.headline();
  const cal = data.payCalendar();
  const [leaving, go] = useGoStep();
  const at = STEPS.indexOf(step);
  const next = STEPS[at + 1];
  const prev = STEPS[at - 1];
  return (
    <div className={s.page}>
      <header className={s.header}>
        <nav aria-label={t("shell.breadcrumb")} className={s.crumbs}>
          <span>{data.companyName[lang]}</span>
          <span aria-hidden="true" className={s.sep}>/</span>
          <span aria-current="page">{t("shell.navPayRun")}</span>
        </nav>
        <h1 className={s.title}>
          {t("payrun.title", { month: formatMonth(h.runMonth, lang) })}
        </h1>
        <p className={s.sub}>
          {t("payrun.sub", { date: formatDayMonth(cal.payday, lang) })}
        </p>
      </header>
      <Stepper step={step} go={go} />
      <div className={s.layout}>
        <div className={s.main}>
          <div key={step} className={s.swap} data-leaving={leaving}>
            <Suspense fallback={<p className={s.loading}>
              {t("payrun.loading")}</p>}>
              {step === "review" && <ReviewStep />}
              {step === "fix" && <FixStep />}
              {step === "approve" && <ApproveStep go={go} />}
              {step === "pay" && <PayStep />}
            </Suspense>
          </div>
          <nav className={s.stepNav} aria-label={t("payrun.stepNav")}>
            {prev !== undefined ? (
              <a href={hrefOf("pay-run", prev)} className={s.navBack}
                onClick={(e) => {
                  e.preventDefault();
                  go(prev);
                }}>
                <span className={s.flip}><Icon name="arrowEnd" /></span>
                {t("payrun.back")}
              </a>
            ) : <span />}
            {next !== undefined && (
              <a href={hrefOf("pay-run", next)} className={s.navNext}
                onClick={(e) => {
                  e.preventDefault();
                  go(next);
                }}>
                {t("payrun.continueTo", { step: t(STEP_LABEL[next]) })}
                <Icon name="arrowEnd" />
              </a>
            )}
          </nav>
        </div>
        <Suspense fallback={null}>
          <Side />
        </Suspense>
      </div>
    </div>
  );
}

const STATE_WORD: Record<StepState, "payrun.stateDone" | "payrun.stateNow" |
  "payrun.stateNext" | "payrun.stateWaiting" | null> = {
  done: "payrun.stateDone", now: "payrun.stateNow", next: "payrun.stateNext",
  waiting: "payrun.stateWaiting", tofix: null,
};

function Stepper(p: { step: StepId; go(to: StepId): void }) {
  const { t } = useLocale();
  const a = useRunApproval();
  const states = stepStates(p.step, a);
  const at = STEPS.indexOf(p.step);
  return (
    <nav className={s.stepper} aria-label={t("payrun.steps")}>
      <p className={s.stepCount}>{t("payrun.stepOf", { n: at + 1 })}</p>
      <ol className={s.stepList}
        style={{ "--fill": progress(a) } as object}>
        <li className={s.track} aria-hidden="true">
          <span className={s.trackFill} />
        </li>
        {STEPS.map((id, i) => {
          const st = states[id];
          const word = STATE_WORD[st];
          return (
            <li key={id} className={s.stepItem} data-state={st}
              data-current={id === p.step}>
              <a href={hrefOf("pay-run", id)} className={s.stepLink}
                aria-current={id === p.step ? "step" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  if (id !== p.step) p.go(id);
                }}>
                <span className={s.node} aria-hidden="true">
                  {st === "done" ? <Icon name="check" size={14} />
                    : <span className="tabular">{i + 1}</span>}
                </span>
                <span className={s.stepText}>
                  <span className={s.stepName}>{t(STEP_LABEL[id])}</span>
                  <span className={s.stepState}>
                    {word === null ? t("payrun.stateToFix",
                      { count: a.blockedBy.length }) : t(word)}
                  </span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** The side panel: the figures worth explaining, and the basis. */
function Side() {
  const { t } = useLocale();
  const d = useRunDetail();
  return (
    <aside className={s.side} aria-labelledby="side-title">
      <h2 id="side-title" className={s.sideTitle}>{t("payrun.sideTitle")}</h2>
      <p className={s.sideSub}>{t("payrun.sideSub")}</p>
      <ul className={s.sideList}>
        {d.featured.map((id) => {
          const e = d.explain[id];
          if (e === undefined) return null;
          return (
            <li key={id}>
              <ExplainLink explanation={e} className={s.sideLink}>
                <span className={s.sideLinkTitle}>{e.title}</span>
                <span className={s.sideLinkSub}>{e.subject}</span>
              </ExplainLink>
            </li>
          );
        })}
      </ul>
      <div className={s.sideNote}>
        <h3 className={s.sideNoteTitle}>{t("payrun.pension")}</h3>
        <p>{d.pensionNote}</p>
      </div>
      <p className={s.sideScope}>{t("payrun.scope", { scope: d.scope })}</p>
    </aside>
  );
}
