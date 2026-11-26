import { Suspense, useState } from "react";
import { useRunApproval } from "../demo/actions";
import { reducedMotion } from "../demo/motion";
import { hrefOf, navigate } from "../demo/route";
import { useDemo } from "../demo/state";
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

/** Leaving takes 200 ms; the next step slides in from the travel side. */
const LEAVE_MS = 200;

export type Go = (to: StepId) => void;

/** Moves to a step in the direction of travel (forward or back). */
export function useGoStep(at: StepId): [boolean, 1 | -1, Go] {
  const [leaving, setLeaving] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);
  const go: Go = (to) => {
    const d = STEPS.indexOf(to) >= STEPS.indexOf(at) ? 1 : -1;
    setDir(d);
    if (reducedMotion()) {
      navigate("pay-run", to);
      return;
    }
    setLeaving(true);
    setTimeout(() => {
      navigate("pay-run", to);
      setLeaving(false);
    }, LEAVE_MS);
  };
  return [leaving, dir, go];
}

/** The pay run in four labelled steps: Review, Fix, Approve, Pay. */
export function PayRun(p: ViewProps) {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const a = useRunApproval();
  const step = stepOf(p.rest);
  const h = data.headline();
  const cal = data.payCalendar();
  const [leaving, dir, go] = useGoStep(step);
  const at = STEPS.indexOf(step);
  const next = STEPS[at + 1];
  const prev = STEPS[at - 1];
  // Approve carries its own next step once the decision is recorded;
  // the footer never offers a way past a blocked or undecided run.
  const nextLocked = step === "approve";
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
      <div key={step} className={s.swap} data-leaving={leaving}
        data-dir={dir}>
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
        {next !== undefined && !nextLocked && (
          <a href={hrefOf("pay-run", next)} className={s.navNext}
            onClick={(e) => {
              e.preventDefault();
              go(next);
            }}>
            {t("payrun.continueTo", { step: t(STEP_LABEL[next]) })}
            <Icon name="arrowEnd" />
          </a>
        )}
        {next !== undefined && nextLocked && a.phase !== "file" && (
          <span className={s.navNext} aria-disabled="true"
            title={t("payrun.payLocked")}>
            {t("payrun.continueTo", { step: t(STEP_LABEL[next]) })}
            <Icon name="arrowEnd" />
          </span>
        )}
      </nav>
      <p className={s.footLine}>{t("payrun.footLine")}</p>
    </div>
  );
}

const STATE_WORD: Record<StepState, "payrun.stateDone" | "payrun.stateNow" |
  "payrun.stateNext" | "payrun.stateWaiting" | null> = {
  done: "payrun.stateDone", now: "payrun.stateNow", next: "payrun.stateNext",
  waiting: "payrun.stateWaiting", tofix: null,
};

/**
 * One persistent stepper: the ring slides to the current step (320 ms,
 * cubic-bezier(.32,.72,0,1)) and the line fills as steps finish. On a
 * phone it is one bar of four dots with the current step named.
 */
function Stepper(p: { step: StepId; go: Go }) {
  const { t } = useLocale();
  const a = useRunApproval();
  const states = stepStates(p.step, a);
  const at = STEPS.indexOf(p.step);
  const word = (id: StepId): string => {
    const w = STATE_WORD[states[id]];
    return w === null ? t("payrun.stateToFix", { count: a.blockedBy.length })
      : t(w);
  };
  return (
    <nav className={s.stepper} aria-label={t("payrun.steps")}>
      <p className={s.stepCount}>
        <span>{t("payrun.stepOf", { n: at + 1 })}</span>
        <span className={s.stepCountName}>
          {t(STEP_LABEL[p.step])}
          <span className={s.stepCountState}
            data-state={states[p.step]}>{word(p.step)}</span>
        </span>
      </p>
      <ol className={s.stepList}
        style={{ "--fill": progress(a), "--at": at } as object}>
        <li className={s.track} aria-hidden="true">
          <span className={s.trackFill} />
        </li>
        <li className={s.ringLane} aria-hidden="true">
          <span className={s.ring} />
        </li>
        {STEPS.map((id, i) => {
          const st = states[id];
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
                  <span className={s.stepState}>{word(id)}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
