import type { SourceStatus } from "../../components/explain/types";

/**
 * Rule keys in plain words, and the law in plain words where its
 * primary text was read (docs/research/2026-11-26-labour-law-primary.md,
 * Decree-Law 33/2021 Art 51 for gratuity). Lives in the lazy data
 * chunk: the entry chunk carries no rule-pack names.
 */

const LAW = "Federal Decree-Law 33 of 2021 on labour relations";

const PLAIN: Record<string, [string, string | null]> = {
  minServiceYears: ["Gratuity is due once a person has worked one full " +
    "year without a break.", "Article 51(2)"],
  tier1DaysPerYear: ["21 days of basic wage for each of the first five " +
    "years of service.", "Article 51(2)(a)"],
  tier1Years: ["21 days of basic wage for each of the first five years " +
    "of service.", "Article 51(2)(a)"],
  tier2DaysPerYear: ["30 days of basic wage for each year after the " +
    "fifth.", "Article 51(2)(b)"],
  partYearProRata: ["Part of a year counts in proportion to the time " +
    "worked.", "Article 51(3)"],
  yearDayCount: ["That part of a year is counted in days out of 365.",
    null],
  unpaidDaysExcluded: ["Days of unpaid leave do not count as service.",
    "Article 51(4)"],
  endDateInclusive: ["The last working day counts as a day of service.",
    null],
  basicWageOnly: ["Gratuity is worked out on the last basic wage, " +
    "without allowances.", "Article 51(5)"],
  dailyWageDivisor: ["A day's basic wage is the monthly basic divided " +
    "by 30.", null],
  capYearsOfWage: ["The gratuity may not be more than two years' wage.",
    "Article 51(6)"],
  capBase: ["That two-year limit is measured on basic wage. The law " +
    "does not say which wage.", null],
  monthsPerYear: ["A year's wage is 12 months of wage.", null],
  roundingMode: ["Rounded once, at the end, to two decimal places.", null],
  leavePayBase: ["Unused annual leave is paid on basic wage.", null],
  leavePayDivisor: ["A day of leave pay is the monthly basic divided by " +
    "30.", null],
  overtimeUpliftBps: ["Overtime is paid at the hourly basic wage plus at " +
    "least 25%.", "Article 19"],
  nightOvertimeUpliftBps: ["Overtime between 10 pm and 4 am is paid at " +
    "the hourly basic wage plus at least 50%.", "Article 19"],
  overtimeMaxMinutesPerDay: ["Overtime should not be more than 2 hours a " +
    "day. More is flagged as a check; the pay is not cut.", "Article 19"],
  maxNormalHoursPerDay: ["A normal working day is 8 hours.",
    "Article 17(1)"],
  dailyDivisor: ["A day's pay is the monthly wage divided by 30.", null],
  prorationBasis: ["A part month is paid by calendar days.", null],
  deductionOverallCapBps: ["All deductions together may not be more " +
    "than half of the wage.", "Article 25"],
  loanConsentRequired: ["A loan is deducted only with the employee's " +
    "written agreement.", "Article 25"],
  deductionCapBase: ["Half is measured on the wage earned this month.",
    null],
  capRoundingMode: ["The limit is rounded down to two decimals.", null],
  deductionOrder: ["Deductions are taken in a set order; a loan comes " +
    "last.", null],
};

/** "tier1DaysPerYear" to "Tier 1 days per year" when not in the map. */
function humanize(key: string): string {
  const s = key.replace(/([a-z])([A-Z0-9])/g, "$1 $2").toLowerCase();
  return `${s[0]?.toUpperCase() ?? ""}${s.slice(1)}.`;
}

/**
 * A rule's sentence and its citation in plain words. Official rules
 * cite the article; secondary ones name their source; conventions say
 * so; unsourced ones have no citation.
 */
export function rulePlain(key: string, note: string | null,
  status: SourceStatus): { text: string; citation: string | null } {
  const [plain, article] = PLAIN[key] ?? [humanize(key), null];
  if (status === "unsourced") return { text: plain, citation: null };
  if (status === "convention") {
    return { text: plain, citation: "A working rule we chose; the law " +
      "does not set it." };
  }
  if (status === "secondary") {
    const src = note ?? "a secondary source";
    return { text: plain, citation: `${src}. Not yet checked against ` +
      "the law's own text." + (article === null ? ""
      : ` The law's ${article} points the same way.`) };
  }
  if (article !== null) {
    return { text: plain, citation: `${LAW}, ${article}.` };
  }
  return { text: plain, citation: note === null ? LAW : `${note}.` };
}
