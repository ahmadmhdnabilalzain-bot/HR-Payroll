import type { Fils } from "@payroll/engine";
import { useLayoutEffect, useRef } from "react";
import { reducedMotion } from "../demo/motion";
import { useDemo } from "../demo/state";
import { formatMoney, moneyParts } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { amountsHidden } from "./mask";
import { RollFace } from "./Rolling";
import s from "./Money.module.css";

type Size = "hero" | "lg" | "md" | "sm";

const MASK = "•".repeat(6);

/** Hide amounts as one gesture, ms. */
const HIDE_MS = 180;

/**
 * Every amount on screen goes through here: one formatter
 * (formatMoney / moneyParts), tabular figures, left-to-right inside
 * Arabic, the fils set smaller, and masked when amounts are hidden.
 * Screen readers get the plain text (a headline figure says its new
 * value politely, the final value only). A changed figure rolls only
 * the digits that changed (ui/Rolling, ui/roll.ts); it never counts
 * up and never reads as an amount in between. While amounts are
 * hidden the mask is drawn and no digit is ever animated.
 */
export function Money(p: { value: Fils; size?: Size; tween?: boolean;
  /** A change: "+" on a rise (a fall always reads "−AED"). */
  signed?: boolean }) {
  const { lang, t } = useLocale();
  const { state } = useDemo();
  const v = p.value;
  const size = p.size ?? "md";
  const hidden = amountsHidden(state);
  const box = useRef<HTMLSpanElement>(null);
  const was = useRef(hidden);
  // Hide amounts as one gesture: whichever face arrives (the dots, or
  // the digits coming back) comes in out of a blur over 180 ms. The
  // real digits are gone from the first frame of hiding: they are
  // never what fades.
  useLayoutEffect(() => {
    if (was.current === hidden) return;
    was.current = hidden;
    if (reducedMotion()) return;
    box.current?.animate([{ opacity: 0, filter: "blur(0.14em)" },
      { opacity: 1, filter: "blur(0)" }],
    { duration: HIDE_MS, easing: "cubic-bezier(0.2, 0, 0, 1)" });
  }, [hidden]);
  if (hidden) {
    return (
      <span className={`${s.money} ${s[size]} ${s.masked}`} dir="ltr"
        ref={box}>
        <span className="visually-hidden">{t("shell.amountsHidden")}</span>
        <span className={s.cur} aria-hidden="true">AED</span>
        <span aria-hidden="true">{MASK}</span>
      </span>
    );
  }
  const plus = p.signed === true;
  const m = moneyParts(v, plus);
  const live = p.tween !== false && (size === "hero" || size === "lg");
  return (
    <span className={`${s.money} ${s[size]}`} dir="ltr" key="shown"
      ref={box}>
      <span className="visually-hidden"
        {...(live ? { "aria-live": "polite" as const } : {})}>
        {formatMoney(p.value, lang, { plus })}</span>
      <RollFace value={v} animate={p.tween !== false} face={{
        sign: m.sign, cur: m.currency, digits: `${m.whole}.${m.frac}`,
        fracAt: m.whole.length }} />
    </span>
  );
}
