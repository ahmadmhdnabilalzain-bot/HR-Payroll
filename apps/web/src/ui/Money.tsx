import { fils, type Fils } from "@payroll/engine";
import { useEffect } from "react";
import { useTweenedBigint } from "../demo/motion";
import { useDemo } from "../demo/state";
import { formatMoney, moneyParts } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import s from "./Money.module.css";

type Size = "hero" | "lg" | "md" | "sm";

const MASK = "•".repeat(6);

/** The last total each opening count-up reached: a return visit starts
 * from it, so a figure already seen is never rebuilt from zero. */
const LAST_SEEN = new Map<string, bigint>();

/**
 * Every amount on screen goes through here: one formatter
 * (formatMoney / moneyParts), tabular figures, left-to-right inside
 * Arabic, the fils set smaller, eased when the value changes, and
 * masked when amounts are hidden. Screen readers get the plain text.
 * While a figure is rolling its digits are dimmed, so a figure on the
 * way to the total never reads as the total (reduced motion: no roll).
 */
export function Money(p: { value: Fils; size?: Size; tween?: boolean;
  /** Count up from zero once, on first show (the opening pass). */
  countUp?: boolean;
  /** A change: "+" on a rise (a fall always reads "−AED"). */
  signed?: boolean }) {
  const { lang, t } = useLocale();
  const { state } = useDemo();
  const size = p.size ?? "md";
  const key = `${size}`;
  const shown = useTweenedBigint(p.value, p.countUp === true ? 800 : 600,
    p.countUp === true ? LAST_SEEN.get(key) ?? 0n : undefined);
  const v = p.tween === false ? p.value : fils(shown);
  const rolling = p.tween !== false && shown !== p.value;
  const counted = p.countUp === true;
  useEffect(() => {
    if (counted && !rolling) LAST_SEEN.set(key, p.value);
  }, [counted, rolling, key, p.value]);
  if (state.hideAmounts) {
    return (
      <span className={`${s.money} ${s[size]} ${s.masked}`} dir="ltr">
        <span className="visually-hidden">{t("shell.amountsHidden")}</span>
        <span className={s.cur} aria-hidden="true">AED</span>
        <span aria-hidden="true">{MASK}</span>
      </span>
    );
  }
  const plus = p.signed === true;
  const m = moneyParts(v, plus);
  return (
    <span className={`${s.money} ${s[size]}`} dir="ltr">
      <span className="visually-hidden">
        {formatMoney(p.value, lang, { plus })}</span>
      <span aria-hidden="true" className={s.lead}>
        {m.sign}<span className={s.cur}>{m.currency}</span>
      </span>
      <span aria-hidden="true" className={rolling ? s.rolling : s.settled}>
        {m.whole}<span className={s.frac}>.{m.frac}</span>
      </span>
    </span>
  );
}
