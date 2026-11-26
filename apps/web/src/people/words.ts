import type {
  DocumentView,
  PayslipLineView,
  Person,
} from "../demo/data/people-types";
import type { MessageKey, T } from "../i18n/t";
import type { Lang } from "../i18n/types";

const LOCALE: Record<Lang, string> = {
  en: "en-AE-u-ca-gregory-nu-latn",
  ar: "ar-AE-u-ca-gregory-nu-latn",
};

const DEMO_YEAR = "2026";

function civil(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1));
}

/** "16 November", with the year only when it is not the demo's year. */
export function dayText(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { timeZone: "UTC",
    day: "numeric", month: "long",
    ...(iso.startsWith(DEMO_YEAR) ? {} : { year: "numeric" }) })
    .format(civil(iso));
}

/** "16 to 20 November", "28 October to 3 November", "20 October". */
export function rangeText(from: string, to: string, lang: Lang): string {
  if (from === to) return dayText(from, lang);
  const f = new Intl.DateTimeFormat(LOCALE[lang], { timeZone: "UTC",
    day: "numeric", month: "long",
    ...(from.startsWith(DEMO_YEAR) && to.startsWith(DEMO_YEAR) ? {}
      : { year: "numeric" }) });
  return f.formatRange(civil(from), civil(to));
}

/** Half-days as days: 45 halves is "22½". */
export function halvesText(halves: number, lang: Lang): string {
  const whole = Math.trunc(halves / 2);
  const half = Math.abs(halves % 2) === 1;
  const n = new Intl.NumberFormat(LOCALE[lang]).format(whole);
  if (!half) return n;
  return whole === 0 ? "½" : `${n}½`;
}

/**
 * Vars for a day-count message: `n` is the shown number ("22½"),
 * `count` picks the plural (half a day reads as one).
 */
export function dayVars(halves: number, lang: Lang)
  : { count: number; n: string } {
  return { count: halves === 1 ? 1 : halves / 2,
    n: halvesText(halves, lang) };
}

/** "22½ days": the plural follows the whole part, "½ day" is one. */
export function daysText(halves: number, t: T, lang: Lang): string {
  return t("people.days", dayVars(halves, lang));
}

const STATUS: Record<Person["status"], MessageKey> = {
  active: "people.statusActive", probation: "people.statusProbation",
  left: "people.statusLeft", joining: "people.statusJoining",
};

export const statusWord = (p: Person, t: T): string => t(STATUS[p.status]);

/** The longer form, with its date where the status has one. */
export function statusLong(p: Person, t: T, lang: Lang): string {
  if (p.statusDate === null) return statusWord(p, t);
  const date = dayText(p.statusDate, lang);
  if (p.status === "probation") {
    return t("people.statusProbationUntil", { date });
  }
  if (p.status === "left") return t("people.statusLeftOn", { date });
  return t("people.statusJoiningOn", { date });
}

const LINE: Record<string, MessageKey> = {
  basic: "people.lineBasic", housing: "people.lineHousing",
  conveyance: "people.lineTransport", transport: "people.lineTransport",
  phone: "people.linePhone", "back-pay": "people.lineBackPay",
  overtime: "people.lineOvertime", "rest-day": "people.lineRestDay",
  holiday: "people.lineHoliday",
  "leave-encashment": "people.lineEncash", loan: "people.lineLoan",
  overpayment: "people.lineOverpayment",
  violation: "people.lineViolation", damage: "people.lineDamage",
  "court-debt": "people.lineCourt", scheme: "people.lineScheme",
  gpssa: "people.lineGpssa",
};

/** A payslip line in plain words; the engine's label if unknown. */
export function lineLabel(l: PayslipLineView, t: T): string {
  const key = (l.code !== null ? LINE[l.code] : undefined) ?? LINE[l.kind];
  return key === undefined ? l.engineLabel : t(key);
}

export type Tone = "neutral" | "ok" | "done" | "warn" | "danger" | "info";

export function expiryWord(d: DocumentView, t: T): [string, Tone] {
  switch (d.state) {
    case "expired": return [t("people.expiryExpired"), "danger"];
    case "expiring-30": return [t("people.expirySoon"), "warn"];
    case "expiring-90": return [t("people.expiryLater"), "info"];
    case "valid": return [t("people.expiryValid"), "ok"];
  }
}

export function statusTone(p: Person): Tone {
  switch (p.status) {
    case "active": return "ok";
    case "probation": return "info";
    case "left": return "neutral";
    case "joining": return "info";
  }
}

/** Country name from its code, in the page's language. */
export function countryName(code: string, lang: Lang): string {
  try {
    return new Intl.DisplayNames([LOCALE[lang]], { type: "region" })
      .of(code) ?? code;
  } catch {
    return code;
  }
}

/** Two initials for an avatar ("Jose Reyes" is "JR"). */
export function initials(name: string): string {
  const w = name.split(" ").filter((x) => x.length > 2);
  return [w[0], w.at(-1)].map((x) => x?.[0] ?? "").join("");
}

/** A day count that may be fractional (a leaver's 18.71 days). */
export function dayCountText(days: number, t: T, lang: Lang): string {
  return t("people.days", dayCountVars(days, lang));
}

/** dayVars for a count in days (whole, half, or a leaver's 18.71). */
export function dayCountVars(days: number, lang: Lang)
  : { count: number; n: string } {
  if (Number.isInteger(days * 2)) return dayVars(days * 2, lang);
  return { count: days, n: new Intl.NumberFormat(LOCALE[lang], {
    maximumFractionDigits: 2 }).format(days) };
}
