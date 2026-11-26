import { useLayoutEffect, useRef, type ReactNode } from "react";
import { reducedMotion } from "../demo/motion";
import { Icon } from "./Icon";
import s from "./SignStamp.module.css";

/** The stamp's landing: 240 ms, from 1.06 to 1 with a fade. */
export const STAMP_MS = 240;

/**
 * A sign-off, as a stamp: who signed (name and role), what it was and
 * when. Shared by the pay run's Approve step and the e-signature sheet.
 * `fresh` (the signature was just made) lands it: scale 1.06 to 1 and
 * a fade over 240 ms, with a faint ring that settles out behind it.
 * Without `fresh` (a page opened later) it is simply there. `seal`
 * (default on) draws the check seal; off where a timeline already
 * marks the step. `declined` draws it dashed and muted, with no seal.
 * `children` add lines under the date (a drawn signature, a reference,
 * a fingerprint). Reduced motion: never animated. Decorative motion
 * only: the text is plain.
 */
export function SignStamp(p: { label: string; name: string; role: string;
  when: string; fresh?: boolean; seal?: boolean; declined?: boolean;
  className?: string | undefined; children?: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (p.fresh !== true || el === null || reducedMotion()) return;
    for (const a of el.getAnimations()) a.cancel();
    el.animate([
      { transform: "scale(1.06)", opacity: 0 },
      { transform: "scale(1)", opacity: 1 },
    ], { duration: STAMP_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
    el.querySelector(`.${s.ring}`)?.animate([
      { opacity: 0.9, transform: "scale(1)" },
      { opacity: 0, transform: "scale(1.08)" },
    ], { duration: 560, delay: STAMP_MS - 40, easing: "ease-out",
      fill: "backwards" });
  }, [p.fresh]);
  return (
    <div ref={box} className={`${s.stamp} ${p.className ?? ""}`}
      data-fresh={p.fresh === true} data-seal={p.seal !== false}
      data-declined={p.declined === true}>
      <span className={s.ring} aria-hidden="true" />
      {p.seal !== false && (
        <span className={s.seal} aria-hidden="true">
          <Icon name="check" size={16} />
        </span>
      )}
      <span className={s.text}>
        <span className={s.label}>{p.label}</span>
        <span className={s.name}>{p.name}</span>
        <span className={s.meta}>{p.role}</span>
        <span className={s.meta}>{p.when}</span>
        {p.children}
      </span>
    </div>
  );
}
