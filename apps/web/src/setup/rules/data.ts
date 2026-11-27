import {
  DEADLINE_PACKS,
  EMPLOYMENT_PACKS,
  GRATUITY_PACKS,
  PAYROLL_PACKS,
  TIME_PACKS,
  type ParamValue,
  type RulePack,
  type RuleStatus,
} from "@payroll/engine";
import { plainOf } from "./words";

/**
 * The rule packs as the Setup screens read them. Only the packs the
 * demo's pay run uses are listed: gratuity, monthly pay, time and
 * leave, notice and settlement, and the salary file dates. Pension
 * and Emiratisation are left out on purpose (the demo computes
 * neither). Tax packs are not part of HR and payroll.
 *
 * This file imports the engine's packs, so it is only reached through
 * the lazy chunk (SetupRules.tsx), never from the entry chunk.
 */
export type { RuleStatus };

export const STATUS_ORDER: readonly RuleStatus[] = ["official",
  "secondary", "convention", "hypothetical", "unsourced"];

/** One plain word for each status; the explain panel adds the rest. */
export const STATUS_WORD: Record<RuleStatus, string> = {
  official: "From the law",
  secondary: "Secondary source",
  convention: "Our working rule",
  hypothetical: "Hypothetical",
  unsourced: "No source yet",
};

export const STATUS_MEANS: Record<RuleStatus, string> = {
  official: "Read from the text of the law or regulation.",
  secondary: "Taken from a secondary source, such as a government " +
    "guide or a note, and not yet checked against the law's own " +
    "text. We read it this way.",
  convention: "A choice the law does not make, so we made it. A " +
    "company may choose differently.",
  hypothetical: "A what-if value. It never feeds a real payslip.",
  unsourced: "No source gives a value. Nothing is worked out from it " +
    "until the company enters one.",
};

/** Statuses the engine shows differently in the demo (as on the
 * explain panel). None now: the 50% limit is in Art 25(2). */
const PRESENTED: Record<string, RuleStatus> = {};

const PACKS: readonly { id: string; name: string;
  packs: readonly RulePack[]; skip?: RegExp }[] = [
  { id: "ae-time", name: "Time and leave", packs: TIME_PACKS },
  { id: "ae-payroll", name: "Monthly pay", packs: PAYROLL_PACKS },
  { id: "ae-gratuity", name: "End-of-service gratuity",
    packs: GRATUITY_PACKS, skip: /^gccNational/ },
  { id: "ae-employment", name: "Probation, notice and settlement",
    packs: EMPLOYMENT_PACKS },
  { id: "ae-deadlines", name: "Salary file dates",
    packs: DEADLINE_PACKS, skip: /^gpssa/ },
];

export interface PackVersion {
  packId: string;
  name: string;
  version: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  rules: number;
}

export interface RuleRow {
  /** "ae-time:timeMaxNormalMinutesPerDay". */
  id: string;
  key: string;
  packId: string;
  packName: string;
  version: string;
  effectiveFrom: string;
  status: RuleStatus;
  /** Plain sentence. */
  text: string;
  /** The value in words, "8 hours", "25%", "Yes", "Not set". */
  value: string;
  raw: ParamValue | null;
  sourceNote: string | null;
  sourceUrl: string | null;
}

const STRINGS: Record<string, string> = {
  "iso-monday": "Monday to Sunday",
  "calendar-year": "January to December",
  "calendar-days": "By calendar days",
  "earned-wage": "Wage earned in the month",
  "extra-day-wage-plus-premium": "A day's wage plus the extra",
  "clamped-months-minus-1-day": "Months added, less one day",
  "clamp-to-last-day-of-month": "Last day of the month",
  "recurring-monthly-total": "Recurring monthly total",
  "last-working-date": "Last working day",
  "day-after-notice": "Day after notice",
  "gpssa,court-debt,overpayment,violation,damage,scheme,loan":
    "Pension, court debt, overpayment, violation, damage, scheme, loan",
  basic: "Basic wage",
  wage: "Wage (basic plus cash allowances)",
  stricter: "The stricter limit",
};
const WINDOW = /^\d\d:\d\d-\d\d:\d\d$/;

function clock12(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const word = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${word}${m === 0 ? "" : `:${String(m).padStart(2, "0")}`} ` +
    (h < 12 ? "am" : "pm");
}

function minutesWord(n: number): string {
  if (n % 60 === 0) {
    const h = n / 60;
    return `${h} ${h === 1 ? "hour" : "hours"}`;
  }
  return `${n} minutes`;
}

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

const sentence = (s: string): string =>
  `${s[0]?.toUpperCase() ?? ""}${s.slice(1)}`;

/** A value in the words a reader expects, from its key's unit. */
export function valueWords(key: string, v: ParamValue | null): string {
  if (v === null) return "Not set";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string") {
    if (WINDOW.test(v)) {
      const [a = "", b = ""] = v.split("-");
      return `${clock12(a)} to ${clock12(b)}`;
    }
    const said = STRINGS[v];
    if (said !== undefined) return said;
    if (v === "HALF_UP") return "Half up";
    if (v === "DOWN") return "Down";
    return sentence(v.replace(/[-_,]/g, " ").trim());
  }
  if (/Bps$/.test(key)) return `${v / 100}%`;
  if (/Minutes/.test(key)) return minutesWord(v);
  if (/^maxHoursPer3Weeks$|^maxNormalHoursPerDay$/.test(key)) {
    return plural(v, "hour", "hours");
  }
  if (/DaysPerYear$/.test(key)) return `${v} days a year`;
  if (/DaysPerMonth$/.test(key)) return `${v} days a month`;
  if (/Days$/.test(key)) return plural(v, "day", "days");
  if (/DayOfNextMonth$/.test(key)) return `Day ${v} of the next month`;
  if (/Months$/.test(key)) return plural(v, "month", "months");
  if (/Years$/.test(key)) return plural(v, "year", "years");
  if (/YearsOfWage$/.test(key)) return `${plural(v, "year", "years")} of wage`;
  if (/Fils$/.test(key)) return "Not set";
  return String(v);
}

function build(): { rows: RuleRow[]; versions: PackVersion[] } {
  const rows: RuleRow[] = [];
  const versions: PackVersion[] = [];
  for (const group of PACKS) {
    for (const pack of group.packs) {
      const keys = Object.keys(pack.params)
        .filter((k) => group.skip === undefined || !group.skip.test(k));
      versions.push({ packId: pack.id, name: group.name,
        version: pack.version, effectiveFrom: pack.effectiveFrom,
        effectiveTo: pack.effectiveTo, rules: keys.length });
      for (const key of keys) {
        const p = pack.params[key];
        if (p === undefined) continue;
        const id = `${pack.id}:${key}`;
        rows.push({ id, key, packId: pack.id, packName: group.name,
          version: pack.version, effectiveFrom: pack.effectiveFrom,
          status: PRESENTED[id] ?? p.status, text: plainOf(key),
          value: valueWords(key, p.value), raw: p.value,
          sourceNote: p.source?.note ?? null,
          sourceUrl: p.source?.url ?? null });
      }
    }
  }
  return { rows, versions };
}

let cache: ReturnType<typeof build> | null = null;
const built = (): ReturnType<typeof build> => (cache ??= build());

/** Every rule of the listed packs, in pack order. */
export function ruleRows(): readonly RuleRow[] {
  return built().rows;
}

export function packVersions(): readonly PackVersion[] {
  return built().versions;
}

export function ruleById(id: string): RuleRow | undefined {
  return ruleRows().find((r) => r.id === id);
}

/** How many rules each status holds, in the fixed status order. */
export function statusCounts(): Record<RuleStatus, number> {
  const out: Record<RuleStatus, number> = { official: 0, secondary: 0,
    convention: 0, hypothetical: 0, unsourced: 0 };
  for (const r of ruleRows()) out[r.status] += 1;
  return out;
}

/** The value of one rule, or throws: a page naming a rule that is not
 * in the packs is a bug, not an empty cell. */
export function ruleOf(packId: string, key: string): RuleRow {
  const r = ruleById(`${packId}:${key}`);
  if (r === undefined) throw new Error(`SETUP_NO_RULE: ${packId}:${key}`);
  return r;
}

/** Public holidays the packs carry: none. Checked, not assumed. */
export function holidayDatesLoaded(): number {
  return ruleRows().filter((r) =>
    /holiday(Date|List|s)\b/i.test(r.key)).length;
}
