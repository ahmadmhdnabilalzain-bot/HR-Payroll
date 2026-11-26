import { formatAed, LTR_ISOLATE, type Fils } from "@payroll/engine";
import { DUBAI } from "../lib/today";
import type { Lang } from "./types";

/** Gregorian calendar, Western digits, in both languages. */
const LOCALE: Record<Lang, string> = {
  en: "en-AE-u-ca-gregory-nu-latn",
  ar: "ar-AE-u-ca-gregory-nu-latn",
};

/** "AED 38,333.33"; in Arabic wrapped in left-to-right isolates. */
export function formatMoney(f: Fils, lang: Lang): string {
  const [open, close] = LTR_ISOLATE[lang];
  return open + formatAed(f) + close;
}

/** A civil date (`YYYY-MM-DD`) as "26 November 2026"; no zone shift. */
export function formatDate(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split("-").map(Number);
  const at = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1));
  return new Intl.DateTimeFormat(LOCALE[lang], {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(at);
}

/** A timestamp's clock time in Dubai, `HH:MM`, 24-hour. */
export function formatTime(isoTimestamp: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    timeZone: DUBAI,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(isoTimestamp));
}

export function formatNumber(n: number, lang: Lang): string {
  return new Intl.NumberFormat(LOCALE[lang]).format(n);
}

export function dirOf(lang: Lang): "ltr" | "rtl" {
  return lang === "ar" ? "rtl" : "ltr";
}
