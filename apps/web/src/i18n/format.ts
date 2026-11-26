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

export interface MoneyParts {
  sign: "" | "-";
  currency: "AED";
  /** Grouped whole dirhams, "612,430". */
  whole: string;
  /** Two-digit fils, "50". */
  frac: string;
}

/**
 * The same amount as formatMoney, split so the fils can be set
 * smaller. Built from formatAed's own output, so there is still one
 * formatter.
 */
export function moneyParts(f: Fils): MoneyParts {
  const text = formatAed(f);
  const sign = text.startsWith("-") ? "-" : "";
  const [whole = "0", frac = "00"] = text.replace(/^-?AED /, "")
    .split(".");
  return { sign, currency: "AED", whole, frac };
}

function civil(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1));
}

/** A civil date (`YYYY-MM-DD`) as "26 November 2026"; no zone shift. */
export function formatDate(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(civil(iso));
}

/** "26 Nov": day and short month, for dense rows. */
export function formatDayMonth(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    timeZone: "UTC", day: "numeric", month: "short",
  }).format(civil(iso));
}

/** "Monday 23 November": the weekday too, for the page date. */
export function formatLongDay(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    timeZone: "UTC", weekday: "long", day: "numeric", month: "long",
  }).format(civil(iso));
}

/** The month's name alone, "October", for running text. */
export function formatMonthName(ym: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    timeZone: "UTC", month: "long",
  }).format(civil(`${ym}-01`));
}

/** A pay month (`YYYY-MM`) as "November 2026". */
export function formatMonth(ym: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    timeZone: "UTC", month: "long", year: "numeric",
  }).format(civil(`${ym}-01`));
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

/** "Priya Nair and Juma Al Zaabi", in the reading language. */
export function formatList(items: string[], lang: Lang): string {
  return new Intl.ListFormat(LOCALE[lang], { type: "conjunction" })
    .format(items);
}

export function dirOf(lang: Lang): "ltr" | "rtl" {
  return lang === "ar" ? "rtl" : "ltr";
}
