import { useLayoutEffect, useRef } from "react";
import { reducedMotion } from "../demo/motion";
import { useLocale } from "../i18n/LocaleProvider";
import { FLIGHT_MS, SPRING } from "../ui/flight";
import { signSequence } from "../ui/SignStamp";
import s from "./PayRun.module.css";
import { safeAnimate, safeGetAnimations } from "../ui/safeAnimate";

/**
 * Where the pay stands against the sign-off: "Pay held until sign-off"
 * (a hairline pill), then "Pay released to the salary file" (ink).
 * The words change the moment the sign-off is recorded; on a fresh
 * sign-off only the ink sweeps across them, on the demo's one spring
 * (ui/flight, 420 ms), once the stamp beside it has landed
 * (signSequence), so the sequence reads: signature, stamp, release.
 * Reduced motion: the pill is simply ink.
 */
export function ReleaseStatus(p: { released: boolean; fresh: boolean }) {
  const { t, dir } = useLocale();
  const ink = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ink.current;
    if (!p.fresh || el === null || reducedMotion()) return;
    for (const a of safeGetAnimations(el)) a.cancel();
    const from = dir === "rtl" ? "inset(0 0 0 100% round 999px)"
      : "inset(0 100% 0 0 round 999px)";
    safeAnimate(el, [{ clipPath: from },
      { clipPath: "inset(0 0 0 0 round 999px)" }],
    { duration: FLIGHT_MS, delay: signSequence(true).release,
      easing: SPRING, fill: "backwards" });
  }, [p.fresh]);
  const word = p.released ? t("payrun.payReleased") : t("payrun.payHeld");
  return (
    <p className={s.release} data-released={p.released} role="status">
      <span className={s.releaseBase}>
        <span className={s.releaseDot} aria-hidden="true" />{word}
      </span>
      {p.released && (
        <span ref={ink} className={s.releaseInk} aria-hidden="true">
          <span className={s.releaseDot} />{word}
        </span>
      )}
    </p>
  );
}
