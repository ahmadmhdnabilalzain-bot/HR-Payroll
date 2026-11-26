import type { Fils } from "@payroll/engine";
import { useDemo } from "../demo/state";
import { formatMoney, moneyParts } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { Money } from "./Money";
import m from "./Money.module.css";
import s from "./RollDigits.module.css";

const STRIP = "0123456789";

/**
 * An amount whose digits roll like an odometer when it changes: each
 * digit is a 0 to 9 strip moved by a transform, the rightmost first,
 * so the change reads digit by digit at full size. Digits are keyed
 * from the right, so the units stay put when the amount gains a digit.
 * Masked when amounts are hidden (through Money); screen readers get
 * the plain amount; reduced motion makes the move instant (base.css).
 */
export function RollDigits(p: { value: Fils; size?: "hero" | "lg" | "md" }) {
  const { lang } = useLocale();
  const { state } = useDemo();
  const size = p.size ?? "lg";
  if (state.hideAmounts) return <Money value={p.value} size={size} />;
  const parts = moneyParts(p.value);
  const chars = [...`${parts.sign}${parts.whole}`];
  const frac = [...parts.frac];
  const total = chars.length + frac.length;
  const cell = (c: string, fromRight: number) => {
    const d = STRIP.indexOf(c);
    if (d < 0) return <span key={`c${fromRight}`}>{c}</span>;
    return (
      <span key={`d${fromRight}`} className={s.slot}>
        <span className={s.strip} style={{ transform:
          `translateY(${-d}em)`, transitionDelay:
          `${Math.min(fromRight, 8) * 30}ms` }}>
          {[...STRIP].map((x) => <span key={x}>{x}</span>)}
        </span>
      </span>
    );
  };
  return (
    <span className={`${m.money} ${m[size]}`} dir="ltr">
      <span className="visually-hidden">{formatMoney(p.value, lang)}</span>
      <span className={m.cur} aria-hidden="true">{parts.currency}</span>
      <span aria-hidden="true" className={s.digits}>
        {chars.map((c, i) => cell(c, total - i))}
        <span className={m.frac}>
          .{frac.map((c, i) => cell(c, frac.length - i))}
        </span>
      </span>
    </span>
  );
}
