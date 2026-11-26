import { formatNumber } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { RollFace } from "./Rolling";
import s from "./Money.module.css";

/**
 * A whole number that changes in place (a headcount, a card's count):
 * the same roll as <Money/>, so 119 to 120 never reads as 110 or 129
 * on the way, and 9 to 10 swaps (old out, then new in). Tabular, no
 * count-up, instant under reduced motion.
 */
export function Count(p: { value: number; animate?: boolean }) {
  const { lang } = useLocale();
  const text = formatNumber(p.value, lang);
  return (
    <span className={`${s.count} tabular`}>
      <RollFace value={p.value} animate={p.animate !== false}
        face={{ digits: text }} plain />
    </span>
  );
}
