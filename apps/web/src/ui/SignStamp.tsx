import { useLayoutEffect, useRef, type ReactNode } from "react";
import { reducedMotion } from "../demo/motion";
import { Icon } from "./Icon";
import s from "./SignStamp.module.css";
import { safeAnimate, safeGetAnimations } from "./safeAnimate";

/** The card coming up under the pen. */
export const PAPER_MS = 180;
/** The signature drawing itself (a stroke, or a wipe for a name). */
export const SIG_MS = 560;
/** When the signature starts, after the card is up. */
export const SIG_AT = 100;
/** The stamp's landing: 1.08 to 1, a soft settle, no bounce. */
export const STAMP_MS = 320;
/** The ring settling out behind a landed stamp. */
export const RING_MS = 600;
const STAMP_EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/**
 * The sign-off sequence, in ms from the moment of signing, so every
 * part (and the pay run's status beside it) runs off one start and a
 * frame capture can seek it: the signature draws, then the stamp lands
 * as the pen lifts, then whatever the signature releases may move.
 */
export function signSequence(hasSignature: boolean): { land: number;
  release: number } {
  const land = hasSignature ? SIG_AT + SIG_MS - 60 : 0;
  return { land, release: land + STAMP_MS - 80 };
}

/** When each signature was just made (for its stamp to land once). */
const signedAt = new Map<string, number>();

/** Notes that a signature was made now (call where it is recorded). */
export function markSigned(key: string): void {
  signedAt.set(key, performance.now());
}

/** True for two seconds after `markSigned(key)`. */
export function justSigned(key: string): boolean {
  const t = signedAt.get(key);
  return t !== undefined && performance.now() - t < 2000;
}

/** Draws the signature inside `el`: a stroke, or a wipe for a name. */
function drawSignature(el: Element, dir: string): void {
  const path = el.querySelector("path");
  if (path !== null && typeof path.getTotalLength === "function") {
    const len = Math.ceil(path.getTotalLength()) + 1;
    safeAnimate(path, [
      { strokeDasharray: `${len}`, strokeDashoffset: `${len}` },
      { strokeDasharray: `${len}`, strokeDashoffset: "0" },
    ], { duration: SIG_MS, delay: SIG_AT, easing:
      "cubic-bezier(0.4, 0, 0.2, 1)", fill: "backwards" });
    return;
  }
  const hidden = dir === "rtl" ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)";
  safeAnimate(el, [
    { clipPath: hidden },
    { clipPath: "inset(0 0 0 0)" },
  ], { duration: SIG_MS, delay: SIG_AT, easing:
    "cubic-bezier(0.4, 0, 0.2, 1)", fill: "backwards" });
}

/**
 * A sign-off, as a stamp: who signed (name and role), what it was and
 * when. Shared by the pay run's Approve step and the e-signature sheet.
 * `fresh` (the signature was just made) plays the sequence: the card
 * comes up (180 ms), the signature (a child marked `data-sig`) draws
 * (560 ms), and as the pen lifts the stamp lands, from 1.08 to 1
 * (320 ms), the seal dropping in and a ring settling out behind it
 * (600 ms). Without a signature the stamp lands at once.
 * Without `fresh` (a page opened later) it is simply there. `seal`
 * (default on) draws the check seal; off where a timeline already
 * marks the step. `declined` draws it dashed and muted, with no seal.
 * `children` add lines under the date (a drawn signature, a reference,
 * a fingerprint). Reduced motion: never animated. Web Animations from
 * one start, so a capture can frame-step it. Decorative motion only:
 * the text is plain and in place from the first frame.
 */
export function SignStamp(p: { label: string; name: string; role: string;
  when: string; fresh?: boolean; seal?: boolean; declined?: boolean;
  /** Label, name and when only, on tighter padding (beside a figure,
   * no taller than it). */
  compact?: boolean;
  className?: string | undefined; children?: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = box.current;
    if (p.fresh !== true || el === null || reducedMotion()) return;
    for (const a of safeGetAnimations(el, { subtree: true })) a.cancel();
    const sig = p.declined === true ? null : el.querySelector("[data-sig]");
    const { land } = signSequence(sig !== null);
    const settle = "cubic-bezier(0.2, 0, 0, 1)";
    if (sig !== null) {
      safeAnimate(el, [{ opacity: 0, transform: "translateY(4px)" },
        { opacity: 1, transform: "none" }],
      { duration: PAPER_MS, easing: settle });
      drawSignature(sig, getComputedStyle(el).direction);
    }
    // The stamp lands: a little large, a hair under, then home. On a
    // stamp with a signature the card is already up, so only the
    // frame and seal land; without one the whole stamp does.
    const target = sig !== null ? el.querySelector(`.${s.frame}`) : el;
    safeAnimate(target, [
      { transform: "scale(1.08)", opacity: 0 },
      { transform: "scale(1)", opacity: 1 },
    ], { duration: STAMP_MS, delay: land, easing: STAMP_EASE,
      fill: "backwards" });
    safeAnimate(el.querySelector(`.${s.seal}`), [
      { transform: "scale(1.5)", opacity: 0 },
      { transform: "scale(0.94)", opacity: 1, offset: 0.6 },
      { transform: "scale(1)", opacity: 1 },
    ], { duration: STAMP_MS, delay: land + 40, easing: settle,
      fill: "backwards" });
    safeAnimate(el.querySelector(`.${s.ring}`), [
      { opacity: 0.9, transform: "scale(1)" },
      { opacity: 0, transform: "scale(1.08)" },
    ], { duration: RING_MS, delay: land + STAMP_MS - 120,
      easing: "ease-out" });
  }, [p.fresh]);
  return (
    <div ref={box} className={`${s.stamp} ${p.className ?? ""}`}
      data-fresh={p.fresh === true} data-seal={p.seal !== false}
      data-declined={p.declined === true}
      data-compact={p.compact === true}>
      <span className={s.frame} aria-hidden="true" />
      <span className={s.ring} aria-hidden="true" />
      {p.seal !== false && (
        <span className={s.seal} aria-hidden="true">
          <Icon name="check" size={16} />
        </span>
      )}
      <span className={s.text}>
        <span className={s.label}>{p.label}</span>
        <span className={s.name}>{p.name}</span>
        {p.compact !== true && <span className={s.meta}>{p.role}</span>}
        <span className={s.meta}>{p.when}</span>
        {p.children}
      </span>
    </div>
  );
}

/** A name signed in script, for a sign-off made with a button. */
export function ScriptSignature(p: { name: string }) {
  return <span className={s.sig} data-sig="" aria-hidden="true">
    {p.name}</span>;
}
