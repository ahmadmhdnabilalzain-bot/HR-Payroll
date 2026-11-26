import { fils, type Fils } from "@payroll/engine";
import { useTweenedBigint } from "../demo/motion";
import { useDemo } from "../demo/state";
import { formatMoney, moneyParts } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import s from "./Money.module.css";

type Size = "hero" | "lg" | "md" | "sm";

/**
 * Every amount on screen goes through here: one formatter
 * (formatMoney / moneyParts), tabular figures, left-to-right inside
 * Arabic, the fils set smaller, eased when the value changes, and
 * masked when amounts are hidden.
 */
export function Money(p: { value: Fils; size?: Size; tween?: boolean }) {
  const { lang, t } = useLocale();
  const { state } = useDemo();
  const shown = useTweenedBigint(p.value);
  const v = p.tween === false ? p.value : fils(shown);
  const size = p.size ?? "md";
  if (state.hideAmounts) {
    return (
      <span className={`${s.money} ${s[size]} ${s.masked}`} dir="ltr"
        role="img" aria-label={t("shell.amountsHidden")}>
        <span className={s.cur}>AED</span>
        <span aria-hidden="true">{"•".repeat(6)}</span>
      </span>
    );
  }
  const m = moneyParts(v);
  return (
    <span className={`${s.money} ${s[size]}`} dir="ltr"
      aria-label={formatMoney(p.value, lang)}>
      <span className={s.cur} aria-hidden="true">{m.currency}</span>
      <span aria-hidden="true">
        {m.sign}{m.whole}<span className={s.frac}>.{m.frac}</span>
      </span>
    </span>
  );
}
