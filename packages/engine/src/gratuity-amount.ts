import type { GratuityParams } from "./gratuity-params";
import { fils, mulDiv, type Fils } from "./money";
import type { ServiceLength } from "./service";
import type { TraceBuilder } from "./trace";

/** An exact non-negative fraction num / den, den > 0. */
interface Fraction {
  num: bigint;
  den: bigint;
}

const show = (f: Fraction): string =>
  f.num % f.den === 0n ? String(f.num / f.den) : `${f.num}/${f.den}`;

function yearsOwed(s: ServiceLength, p: GratuityParams): Fraction {
  const whole = BigInt(s.completedYears);
  if (!p.partYearProRata.v) return { num: whole, den: 1n };
  const den = p.yearDayCount.v;
  return { num: whole * den + BigInt(s.leftoverDays), den };
}

/** Days owed in each tier, both over the same denominator as years. */
function tierDays(years: Fraction, p: GratuityParams) {
  const limit = p.tier1Years.v * years.den;
  const inTier1 = years.num < limit ? years.num : limit;
  const tier1 = { num: p.tier1DaysPerYear.v * inTier1, den: years.den };
  const tier2 = {
    num: p.tier2DaysPerYear.v * (years.num - inTier1),
    den: years.den,
  };
  return { tier1, tier2 };
}

function traceTiers(
  t: TraceBuilder,
  years: Fraction,
  tiers: { tier1: Fraction; tier2: Fraction },
  p: GratuityParams,
): void {
  t.add({
    id: "gratuity.tier1", label: "Tier 1 days owed",
    formula: "tier1DaysPerYear * min(yearsOwed, tier1Years); yearsOwed = " +
      "completedYears + leftoverDays / yearDayCount when partYearProRata",
    inputs: { yearsOwed: show(years) }, result: show(tiers.tier1),
    rules: [p.tier1DaysPerYear.rule, p.tier1Years.rule,
      p.partYearProRata.rule, p.yearDayCount.rule],
  });
  t.add({
    id: "gratuity.tier2", label: "Tier 2 days owed",
    formula: "tier2DaysPerYear * max(yearsOwed - tier1Years, 0)",
    inputs: { yearsOwed: show(years) }, result: show(tiers.tier2),
    rules: [p.tier2DaysPerYear.rule, p.tier1Years.rule],
  });
}

function capOf(basic: Fils, p: GratuityParams): Fils {
  return fils(basic * p.monthsPerYear.v * p.capYearsOfWage.v);
}

function traceCap(
  t: TraceBuilder,
  basic: Fils,
  exact: Fraction,
  applied: boolean,
  p: GratuityParams,
): void {
  t.add({
    id: "gratuity.cap",
    label: applied ? "Cap applied" : "Cap not applied",
    formula: "lastBasicMonthly * monthsPerYear * capYearsOfWage",
    inputs: { lastBasicMonthly: String(basic), uncappedFils: show(exact),
      capApplied: String(applied) },
    result: String(capOf(basic, p)),
    rules: [p.monthsPerYear.rule, p.capYearsOfWage.rule, p.capBase.rule,
      p.basicWageOnly.rule],
  });
}

/** Amount owed, kept as one exact fraction and rounded once. */
export function eligibleAmount(
  t: TraceBuilder,
  basic: Fils,
  s: ServiceLength,
  p: GratuityParams,
): Fils {
  const years = yearsOwed(s, p);
  const tiers = tierDays(years, p);
  traceTiers(t, years, tiers, p);
  const days = { num: tiers.tier1.num + tiers.tier2.num, den: years.den };
  const den = days.den * p.dailyWageDivisor.v;
  const exact = { num: basic * days.num, den };
  const cap = capOf(basic, p);
  const applied = exact.num > cap * den;
  traceCap(t, basic, exact, applied, p);
  const amount = applied
    ? cap
    : mulDiv(basic, days.num, den, p.roundingMode.v);
  t.add({
    id: "gratuity.total", label: "Gratuity",
    formula: "min(lastBasicMonthly / dailyWageDivisor * daysOwed, cap), " +
      "rounded once with roundingMode",
    inputs: { daysOwed: show(days), lastBasicMonthly: String(basic),
      capApplied: String(applied) },
    result: String(amount),
    rules: [p.dailyWageDivisor.rule, p.roundingMode.rule],
  });
  return amount;
}
