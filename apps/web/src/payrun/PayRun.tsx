import { Suspense, useState } from "react";
import { reducedMotion } from "../demo/motion";
import { hrefOf, navigate } from "../demo/route";
import { Footnote } from "../components/explain";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import type { ViewProps } from "../views";
import { isPayArea, PayArea } from "../pay/PayArea";
import { ApproveStep } from "./ApproveStep";
import { FixStep } from "./FixStep";
import { stepOf, STEPS, type StepId } from "./model";
import { PayStep } from "./PayStep";
import { ReviewStep } from "./ReviewStep";
import { RunBar } from "./RunBar";
import s from "./PayRun.module.css";

/** Leaving takes 200 ms; the next step slides in from the travel side. */
const LEAVE_MS = 200;

export type Go = (to: StepId) => void;

/**
 * Moves to a step in the direction of travel (forward or back). The
 * step being left fades out first; `toward` names the step the stepper
 * ring should already be sliding to, so it starts with the tap.
 */
export function useGoStep(at: StepId): [boolean, 1 | -1, Go, StepId] {
  const [leaving, setLeaving] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);
  const [toward, setToward] = useState<StepId | null>(null);
  const go: Go = (to) => {
    const d = STEPS.indexOf(to) >= STEPS.indexOf(at) ? 1 : -1;
    setDir(d);
    if (reducedMotion()) {
      navigate("pay-run", to);
      return;
    }
    setToward(to);
    setLeaving(true);
    setTimeout(() => {
      navigate("pay-run", to);
      setLeaving(false);
      setToward(null);
    }, LEAVE_MS);
  };
  return [leaving, dir, go, toward ?? at];
}

/**
 * `#/pay-run/...`: the run's four steps, or a WP6 pay area (loans,
 * revisions, ...) when the first segment names one.
 */
export function PayRun(p: ViewProps) {
  return isPayArea(p.rest[0]) ? <PayArea rest={p.rest} />
    : <RunSteps rest={p.rest} />;
}

/** The pay run in four labelled steps: Review, Fix, Approve, Pay. */
function RunSteps(p: ViewProps) {
  const { t } = useLocale();
  const step = stepOf(p.rest);
  const [leaving, dir, go, toward] = useGoStep(step);
  const at = STEPS.indexOf(step);
  const prev = STEPS[at - 1];
  return (
    <>
    <RunBar step={toward} go={go} />
    <div className={s.page}>
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
      {prev !== undefined && (
      <nav className={s.stepNav} aria-label={t("payrun.stepNav")}>
        {(
          <a href={hrefOf("pay-run", prev)} className={s.navBack}
            onClick={(e) => {
              e.preventDefault();
              go(prev);
            }}>
            <span className={s.flip}><Icon name="arrowEnd" /></span>
            {t("payrun.back")}
          </a>
        )}
      </nav>
      )}
      <Footnote className={s.footLine} />
    </div>
    </>
  );
}
