/**
 * Every rule in plain words: one sentence per rule key, written from
 * the rule pack's own comments (which quote the law's article). Keys
 * not listed here fall back to their name in words (see `plainOf`).
 * Arabic stays hidden, so these are English only.
 */
const PLAIN: Record<string, string> = {
  // Gratuity
  minServiceYears: "Gratuity is due after one full year of service.",
  tier1DaysPerYear: "21 days of basic wage for each of the first five " +
    "years.",
  tier1Years: "The first tier covers the first five years of service.",
  tier2DaysPerYear: "30 days of basic wage for each year after the " +
    "fifth.",
  capYearsOfWage: "Gratuity may not be more than two years of wage.",
  capBase: "The two-year limit is measured on basic wage. The law does " +
    "not say which wage.",
  unpaidDaysExcluded: "Days of unpaid leave do not count as service.",
  basicWageOnly: "Gratuity uses the last basic wage, without allowances.",
  nationalsExcluded: "UAE nationals follow the pension rules, not " +
    "this gratuity.",
  leavePayBase: "Unused annual leave is paid on basic wage.",
  dailyWageDivisor: "A day of basic wage is the monthly basic divided " +
    "by 30.",
  leavePayDivisor: "A day of leave pay is the monthly basic divided by " +
    "30. We chose the 30.",
  partYearProRata: "Part of a year counts in proportion to the time " +
    "worked.",
  monthsPerYear: "A year of wage is 12 months.",
  yearDayCount: "The days left over in a part year are counted out of " +
    "365.",
  endDateInclusive: "The last working day counts as a day of service.",
  leapDayAnniversary: "A 29 February joiner's anniversary falls on the " +
    "last day of February in other years.",
  roundingMode: "Amounts are rounded once, at the end, to the nearest " +
    "fils.",
  gccNationalGratuity: "Gratuity for other Gulf nationals has no source " +
    "yet, so no value is held.",
  // Pay: overtime and rest days
  overtimeUpliftBps: "Overtime is the hourly basic wage plus at least " +
    "25%.",
  nightOvertimeUpliftBps: "Overtime between 10 pm and 4 am is the " +
    "hourly basic wage plus at least 50%.",
  nightWindow: "Night work is between 10 pm and 4 am.",
  shiftWorkersNightExcluded: "Shift workers are left out of the night " +
    "overtime rate.",
  overtimeMaxMinutesPerDay: "Overtime should not pass 2 hours a day. " +
    "More is flagged for a check; pay is never cut.",
  maxHoursPer3Weeks: "Overtime and normal hours together: at most 144 " +
    "hours in three weeks. Shown, not checked.",
  maxNormalHoursPerDay: "A normal working day is 8 hours.",
  restDayUpliftBps: "Work on a rest day earns a day's wage plus at " +
    "least 50%.",
  holidayUpliftBps: "Work on an official holiday earns a day's wage " +
    "plus at least 50%.",
  restDayPayMode: "Our reading: the monthly salary already pays the " +
    "rest day, so the extra is a day's wage plus the premium.",
  restDayWageBase: "The wage for a rest day is basic plus cash " +
    "allowances.",
  dailyDivisor: "A day of pay is the monthly wage divided by 30.",
  prorationBasis: "A part month is paid by calendar days.",
  // Pay: leave
  sickFullPayDays: "Sick leave: the first 15 days on full pay.",
  sickHalfPayDays: "Sick leave: the next 30 days on half pay.",
  sickMaxDays: "Sick leave is at most 90 days a year.",
  sickPaidInProbation: "No paid sick leave during probation.",
  paidLeaveBase: "Paid leave is paid on the wage: basic plus cash " +
    "allowances.",
  maternityFullPayDays: "Maternity leave: the first 45 days on full pay.",
  maternityHalfPayDays: "Maternity leave: the next 15 days on half pay.",
  maternityUnpaidExtraDays: "Up to 45 more days of maternity leave, " +
    "unpaid.",
  encashInServiceBase: "Leave paid in cash during service is paid on " +
    "the wage earned.",
  // Pay: deductions
  deductionOverallCapBps: "All deductions together may not be more " +
    "than half of the wage.",
  overpaymentCapBps: "Recovering an overpayment may take at most 20% " +
    "of the wage.",
  violationCapBps: "A deduction for a violation may take at most 5% " +
    "of the wage.",
  violationCapDays: "A violation deduction may not pass five days of " +
    "wage a month.",
  damageCapDays: "A deduction for damage may not pass five days of " +
    "wage a month.",
  courtDebtCapBps: "A court-ordered debt may take at most a quarter " +
    "of the wage.",
  loanConsentRequired: "A loan is deducted only with the employee's " +
    "written agreement.",
  schemeConsentRequired: "A scheme deduction needs written agreement. " +
    "We ask for it in every case.",
  violationCapRule: "Where two limits apply to a violation, the " +
    "stricter one is used.",
  deductionCapBase: "The limit is measured on the wage earned in the " +
    "month.",
  deductionOrder: "Deductions come off in a set order; a loan comes " +
    "last.",
  capRoundingMode: "A limit is rounded down to the fils.",
  // Time
  timeMaxNormalMinutesPerDay: "A normal working day is 8 hours.",
  timeMaxNormalMinutesPerWeek: "A normal working week is 48 hours.",
  timeRamadanReductionMinutes: "In Ramadan the working day is two " +
    "hours shorter.",
  timeMaxConsecutiveWorkMinutes: "No more than five hours in a row " +
    "without a break.",
  timeMinRestBreakMinutes: "Breaks add up to at least one hour in a " +
    "working day.",
  timeOvertimeMaxMinutesPerDay: "Overtime should not pass 2 hours a " +
    "day. More is flagged; pay is never cut.",
  timeMaxMinutesPer3Weeks: "At most 144 hours of overtime in three " +
    "weeks.",
  timeNightWindow: "Night work is between 10 pm and 4 am.",
  timeMaxConsecutiveRestDaysWorked: "No one may be asked to work more " +
    "than two rest days in a row.",
  timeMinWeeklyRestDays: "At least one paid rest day every week.",
  timeHolidayWorkCompensated: "Work on an official holiday earns a " +
    "rest day or extra pay.",
  timeAnnualLeaveMinDays: "At least 30 days of annual leave a year.",
  timeFirstYearDaysPerMonth: "Between six months and a year of " +
    "service: 2 days of leave for each month.",
  timeCarryOverMaxShareBps: "Up to half of the annual leave may be " +
    "carried to the next year.",
  timeSickLeaveMaxDays: "Sick leave is at most 90 days a year.",
  timeSickLeaveMaxDaysPerYear: "Sick leave is at most 90 days a year.",
  timeMaternityLeaveDays: "Maternity leave is 60 days.",
  timeWeekBasis: "Our choice: a week runs Monday to Sunday.",
  timeLeaveYear: "Our choice: the leave year is the calendar year.",
  timeWfhRetentionDays: "How long work-from-home records are kept: no " +
    "source sets a period, so the company must choose one.",
  // Employment
  empProbationMaxMonths: "Probation is at most six months.",
  empProbationEmployerNoticeDays: "The employer gives 14 days of " +
    "written notice to end probation.",
  empProbationLeaveStateNoticeDays: "A foreign worker leaving the " +
    "country during probation gives 14 days of notice.",
  empProbationNewEmployerNoticeMonths: "A worker moving to another " +
    "employer in the country during probation gives one month of " +
    "written notice.",
  empProbationEndRule: "Our reading: probation ends on the joining date " +
    "plus the months, less one day.",
  empNoticeMinDays: "Notice to end a contract is at least 30 days.",
  empNoticeMaxDays: "Notice to end a contract is at most 90 days.",
  empNoticeReducibleByAgreement: "Notice may be shortened or waived " +
    "by agreement.",
  empJobSearchDayRight: "When the employer ends the contract, the " +
    "worker may take one unpaid working day a week to look for work.",
  empSummaryDismissalNoticeDays: "Dismissal without notice: zero days " +
    "of notice is our reading. Take advice before relying on it.",
  empWorkerExitWithoutNoticeDays: "A worker leaving without notice: " +
    "zero days is our reading. Take advice before relying on it.",
  empNoticeStartRule: "Our choice: notice counts from the day after it " +
    "is given in writing.",
  empSettlementDueDays: "The final settlement is due within 14 days.",
  empSettlementTrigger: "Our reading: the 14 days run from the last " +
    "working day.",
  // Salary file dates
  wpsDueDayOfNextMonth: "The salary for a month is due on the 1st of " +
    "the next month.",
  wpsLateAlertDayOfNextMonth: "We alert from the 2nd of the next " +
    "month if the salary is still unpaid.",
  wpsFinePerWorkerFils: "A fine per worker for late pay: no source " +
    "gives an amount, so nothing is calculated.",
  wpsFineCapFils: "A limit on those fines: no source gives one, so " +
    "nothing is calculated.",
};

/** "tier1DaysPerYear" to "Tier 1 days per year." for unlisted keys. */
function humanize(key: string): string {
  const s = key.replace(/([a-z])([A-Z0-9])/g, "$1 $2").toLowerCase();
  return `${s[0]?.toUpperCase() ?? ""}${s.slice(1)}.`;
}

export function plainOf(key: string): string {
  return PLAIN[key] ?? humanize(key);
}

export function hasPlain(key: string): boolean {
  return Object.hasOwn(PLAIN, key);
}
