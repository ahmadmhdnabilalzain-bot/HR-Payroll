import { Suspense, useEffect, useRef, useState, type RefObject }
  from "react";
import { loadRunSource } from "../demo/data/run-load";
import { loadLiveExplain } from "../demo/live-explain-load";
import { dur, easeOut } from "../ui/templates/listEnter";
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

export type Go = (to: StepId) => void;

/**
 * The step being left, as a drawn copy over the page: it fades out
 * (--dur-fast) and drifts 24 px against the travel while the next step,
 * already mounted with its data, slides in (--dur-base). There is never
 * a blank page between steps.
 */
function leaveCopy(swap: HTMLElement, d: 1 | -1): void {
  const page = swap.parentElement;
  if (page === null) return;
  const copy = swap.cloneNode(true) as HTMLElement;
  copy.removeAttribute("class");
  copy.setAttribute("aria-hidden", "true");
  copy.setAttribute("inert", "");
  copy.querySelectorAll("[id]").forEach((x) => x.removeAttribute("id"));
  copy.className = s.leaving ?? "";
  const rtl = getComputedStyle(page).direction === "rtl";
  const start = rtl
    ? page.clientWidth - swap.offsetLeft - swap.offsetWidth
    : swap.offsetLeft;
  Object.assign(copy.style, { insetBlockStart: `${swap.offsetTop}px`,
    insetInlineStart: `${start}px`, inlineSize: `${swap.offsetWidth}px` });
  page.appendChild(copy);
  const fast = dur("--dur-fast");
  // Opacity on the copy itself (a veil would paint paper over the step
  // coming in underneath); the copy is hidden from assistive tech.
  const dx = -24 * d * (rtl ? -1 : 1);
  copy.animate([{ opacity: 1, transform: "none" },
    { opacity: 0, transform: `translateX(${dx}px)` }],
  { duration: fast, easing: easeOut(), fill: "forwards" })
    .onfinish = () => copy.remove();
}

/**
 * Moves to a step in the direction of travel (forward or back), at
 * once: the step left fades over the next one coming in.
 */
export function useGoStep(at: StepId, swap: RefObject<HTMLElement | null>)
  : [1 | -1, Go] {
  const [dir, setDir] = useState<1 | -1>(1);
  const go: Go = (to) => {
    const d = STEPS.indexOf(to) >= STEPS.indexOf(at) ? 1 : -1;
    setDir(d);
    if (!reducedMotion() && swap.current !== null) {
      leaveCopy(swap.current, d);
    }
    navigate("pay-run", to);
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
  const swap = useRef<HTMLDivElement>(null);
  const [dir, go] = useGoStep(step, swap);
  // Every step's data is fetched with the first one, so a step change
  // never waits on it.
  useEffect(() => {
    void loadRunSource();
    void loadLiveExplain();
  }, []);
  const at = STEPS.indexOf(step);
  const prev = STEPS[at - 1];
  return (
    <>
    <RunBar step={step} go={go} />
    <div className={s.page}>
      <div key={step} className={s.swap} data-dir={dir} ref={swap}>
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
