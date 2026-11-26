import { fils, type Fils } from "@payroll/engine";
import { useTweenedBigint } from "../demo/motion";
import { useDemo } from "../demo/state";
import { formatMoney, moneyParts } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { amountsHidden } from "./mask";
import s from "./Money.module.css";

type Size = "hero" | "lg" | "md" | "sm";

const MASK = "•".repeat(6);

/**
 * Every amount on screen goes through here: one formatter
 * (formatMoney / moneyParts), tabular figures, left-to-right inside
 * Arabic, the fils set smaller, eased when the value changes, and
 * masked when amounts are hidden. Screen readers get the plain text.
 */
export function Money(p: { value: Fils; size?: Size; tween?: boolean;
  /** Count up from zero once, on first show (the opening pass). */
  countUp?: boolean;
  /** A change: "+" on a rise (a fall always reads "−AED"). */
  signed?: boolean }) {
  const { lang, t } = useLocale();
  const { state } = useDemo();
  const shown = useTweenedBigint(p.value, p.countUp === true ? 800 : 600,
    p.countUp === true ? 0n : undefined);
  const v = p.tween === false ? p.value : fils(shown);
  const size = p.size ?? "md";
  if (amountsHidden(state)) {
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
      {m.sign !== "" && (
        <span className={s.sign} aria-hidden="true">{m.sign}</span>
      )}
      <span className={s.cur} aria-hidden="true">{m.currency}</span>
      <span aria-hidden="true">
        {m.whole}<span className={s.frac}>.{m.frac}</span>
      </span>
    </span>
  );
}
