import { Suspense, useState } from "react";
import { hrefOf, navigate } from "../demo/route";
import { Footnote } from "../components/explain";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import { moveWithin } from "../ui/routeMotion";
import type { ViewProps } from "../views";
import { isPayArea, PayArea } from "../pay/PayArea";
import { ApproveStep } from "./ApproveStep";
import { FixStep } from "./FixStep";
import { stepOf, STEPS, type StepId } from "./model";
import { PayStep } from "./PayStep";
import { ReviewStep } from "./ReviewStep";
import { RunBar } from "./RunBar";
import s from "./PayRun.module.css";

export type Go = (to: StepId) => void;

/**
 * Moves to a step in the direction of travel (forward or back), as one
 * overlapped move (ui/routeMotion.ts, "quick"): the old step fades and
 * slides 8 px out over 120 ms while the new one comes 8 px in over
 * 200 ms. The old step stays on screen until the new one has rendered,
 * so no frame is blank; the step bar holds still and its ring slides.
 * Without view transitions, the new step slides in on its own (CSS).
 */
export function useGoStep(at: StepId): [1 | -1, Go] {
  const [dir, setDir] = useState<1 | -1>(1);
  const go: Go = (to) => {
    const d = STEPS.indexOf(to) >= STEPS.indexOf(at) ? 1 : -1;
    setDir(d);
    moveWithin(d, () => navigate("pay-run", to), () =>
      document.querySelector(`[data-step="${to}"]`) !== null);
  };
  return [dir, go];
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
  const [dir, go] = useGoStep(step);
  const at = STEPS.indexOf(step);
  const prev = STEPS[at - 1];
  return (
    <>
    <RunBar step={step} go={go} />
    <div className={s.page}>
      <div key={step} className={s.swap} data-step={step} data-dir={dir}>
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
