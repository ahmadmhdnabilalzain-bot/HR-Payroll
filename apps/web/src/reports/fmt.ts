import type { Fils } from "@payroll/engine";
import { useDemo } from "../demo/state";
import { formatMoney } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";

const MASK = "AED ••••••";

/** "+2.4%" or "-1.0%" from two amounts, one decimal, never a float sum. */
export function percent(part: bigint, whole: bigint): string {
  if (whole === 0n) return "0.0%";
  const neg = part < 0n;
  const tenths = ((neg ? -part : part) * 2000n / whole + 1n) / 2n;
  const t = Number(tenths) / 10;
  return `${neg ? "-" : "+"}${t.toFixed(1)}%`;
}

/** "3.3%" without a sign. */
export function share(part: number, whole: number): string {
  if (whole === 0) return "none";
  return `${(Math.round(part * 1000 / whole) / 10).toFixed(1)}%`;
}

export const hours = (minutes: number): string =>
  `${Number((minutes / 60).toFixed(2))}`;

export const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

export interface Money {
  /** "AED 1,234.00", or the mask while amounts are hidden. */
  m(f: Fils): string;
  /** The same with a plus sign on a rise. */
  signed(f: Fils): string;
}

/** Money as text for tables: one formatter, masked like <Money/>. */
export function useMoney(): Money {
  const { lang } = useLocale();
  const { state } = useDemo();
  const m = (f: Fils): string => state.hideAmounts ? MASK
    : formatMoney(f, lang);
  return { m, signed: (f) => (f > 0n ? "+" : "") + m(f) };
}

/** "+AED 5.00 (+0.1%)"; tiny moves say "no real change". */
export function changeText(diff: bigint, before: bigint,
  signed: (f: Fils) => string): string {
  if (diff === 0n) return "No change";
  const pct = percent(diff, before);
  const tiny = /^[+-]0\.0%$/.test(pct);
  return tiny ? signed(diff as Fils) : `${signed(diff as Fils)} (${pct})`;
}
