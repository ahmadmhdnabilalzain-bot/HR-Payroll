import type { DemoData } from "../../demo/data/types";
import { formatDate } from "../../i18n/format";
import type { Lang } from "../../i18n/types";
import { sampleHolidayText } from "../structure/data";
import { holidayDatesLoaded, ruleOf } from "./data";
import type { GroupSpec, ItemSpec, PageSpec } from "./RuleSettings";

const TIME = "ae-time";
const PAY = "ae-payroll";
const EOS = "ae-gratuity";
const EMP = "ae-employment";
const DL = "ae-deadlines";

const r = (pack: string, key: string, label: string,
  more: Partial<ItemSpec> = {}): ItemSpec =>
  ({ key: `${pack}:${key}`, rule: [pack, key], label, ...more });

const g = (title: string, ...items: ItemSpec[]): GroupSpec =>
  ({ title, items });

const LAW_MIN = "The law gives at least";
const LAW_MAX = "The law allows at most";

/** Leave types from the data, then the rules behind them. */
export function leavePage(d: DemoData): PageSpec {
  const types = d.people.leaveTypes().map((t): ItemSpec => {
    if (t.id === "lt-annual") {
      return { key: "policy:annualDays", label: t.name.en,
        value: `${t.annualDays ?? 0} days a year, paid`,
        help: "Company policy. Leave is credited month by month.",
        edit: { unit: "days", min: Number(
          ruleOf(TIME, "timeAnnualLeaveMinDays").raw), max: 60,
          why: LAW_MIN } };
    }
    return { key: `type:${t.id}`, label: t.name.en,
      value: t.paid ? "Paid, in steps (see sick leave below)"
        : "Not paid",
      help: t.paid ? "Days used are counted; there is no yearly balance."
        : "Days used are counted and taken out of the month's pay." };
  });
  return { title: "Leave policies",
    lede: "Leave types, and the rules behind them.",
    groups: [
      g("Leave types", ...types),
      g("Annual leave",
        r(TIME, "timeAnnualLeaveMinDays", "At least, by law"),
        r(TIME, "timeFirstYearDaysPerMonth", "First year"),
        r(TIME, "timeCarryOverMaxShareBps", "Carried to next year",
          { edit: { unit: "%", min: 0, max: 50, why: LAW_MAX } }),
        r(TIME, "timeLeaveYear", "Leave year")),
      g("Sick leave",
        r(PAY, "sickFullPayDays", "On full pay"),
        r(PAY, "sickHalfPayDays", "On half pay"),
        r(PAY, "sickMaxDays", "At most a year"),
        r(PAY, "sickPaidInProbation", "Paid in probation")),
      g("Maternity leave",
        r(PAY, "maternityFullPayDays", "On full pay"),
        r(PAY, "maternityHalfPayDays", "On half pay"),
        r(PAY, "maternityUnpaidExtraDays", "Extra, unpaid")),
      g("How leave is paid",
        r(PAY, "paidLeaveBase", "Paid on"),
        r(PAY, "encashInServiceBase", "Cash in service, paid on")),
    ] };
}

export function hoursPage(): PageSpec {
  return { title: "Working hours and overtime",
    lede: "The working day, and what extra work pays.",
    groups: [
      g("Working hours",
        r(TIME, "timeMaxNormalMinutesPerDay", "Normal day",
          { edit: { unit: "hours", min: 1, max: 8, why: LAW_MAX } }),
        r(TIME, "timeMaxNormalMinutesPerWeek", "Normal week"),
        r(TIME, "timeMaxConsecutiveWorkMinutes", "Longest stretch"),
        r(TIME, "timeMinRestBreakMinutes", "Breaks in a day"),
        r(TIME, "timeWeekBasis", "Week runs")),
      g("Overtime pay, extra on the hourly basic wage",
        r(PAY, "overtimeUpliftBps", "Overtime",
          { edit: { unit: "%", min: 25, max: 200, why: LAW_MIN } }),
        r(PAY, "nightOvertimeUpliftBps", "Night overtime",
          { edit: { unit: "%", min: 50, max: 200, why: LAW_MIN } }),
        r(PAY, "nightWindow", "Night hours"),
        r(PAY, "shiftWorkersNightExcluded", "Shift workers at night"),
        r(PAY, "restDayUpliftBps", "Work on a rest day",
          { edit: { unit: "%", min: 50, max: 200, why: LAW_MIN } })),
      g("Limits",
        r(TIME, "timeOvertimeMaxMinutesPerDay", "Overtime a day"),
        r(TIME, "timeMaxMinutesPer3Weeks", "Overtime in three weeks"),
        r(TIME, "timeMaxConsecutiveRestDaysWorked",
          "Rest days worked in a row"),
        r(TIME, "timeMinWeeklyRestDays", "Rest days a week")),
    ] };
}

export function holidaysPage(): PageSpec {
  const n = holidayDatesLoaded();
  const sample = sampleHolidayText();
  return { title: "Holidays and Ramadan hours",
    lede: "Public holidays and the shorter day in Ramadan.",
    groups: [
      g("Public holidays",
        { key: "holidays:dates", label: "Holiday dates",
          value: n === 0 ? `${sample.count} sample dates`
            : `${n} loaded`,
          help: n === 0 ? `${sample.note} ${sample.names}. Leave day ` +
            "counts still skip weekends only." : "" }),
      g("Work on a holiday",
        r(TIME, "timeHolidayWorkCompensated", "Compensated"),
        r(PAY, "holidayUpliftBps", "Extra pay",
          { edit: { unit: "%", min: 50, max: 200, why: LAW_MIN } })),
      g("Ramadan",
        r(TIME, "timeRamadanReductionMinutes", "Shorter working day",
          { edit: { unit: "hours", min: 2, max: 4, why: LAW_MIN } }),
        { key: "ramadan:dates", label: "Ramadan dates",
          value: "None loaded",
          help: "The packs hold no Ramadan dates. The shorter day is " +
            "not applied to any date yet." }),
    ] };
}

export function endOfServicePage(): PageSpec {
  return { title: "End-of-service rules",
    lede: "Gratuity, notice and the final settlement, for people who " +
      "are not UAE nationals. UAE nationals follow the pension rules, " +
      "which this demo does not work out.",
    groups: [
      g("Gratuity",
        r(EOS, "minServiceYears", "Due after"),
        r(EOS, "tier1DaysPerYear", "First five years"),
        r(EOS, "tier2DaysPerYear", "After the fifth year"),
        r(EOS, "capYearsOfWage", "Most it can be"),
        r(EOS, "capBase", "Limit measured on"),
        r(EOS, "basicWageOnly", "Worked out on basic wage only")),
      g("Counting service",
        r(EOS, "unpaidDaysExcluded", "Unpaid leave left out"),
        r(EOS, "partYearProRata", "Part of a year"),
        r(EOS, "endDateInclusive", "Last day counts"),
        r(EOS, "roundingMode", "Rounding")),
      g("Notice and probation",
        r(EMP, "empProbationMaxMonths", "Probation, at most"),
        r(EMP, "empNoticeMinDays", "Notice, at least"),
        r(EMP, "empNoticeMaxDays", "Notice, at most"),
        r(EMP, "empNoticeReducibleByAgreement", "Notice can be shortened")),
      g("Final settlement",
        r(EMP, "empSettlementDueDays", "Due within"),
        r(EMP, "empSettlementTrigger", "Counted from")),
    ] };
}

export function deductionsPage(): PageSpec {
  return { title: "Deductions rules",
    lede: "What may be taken from pay, and the limits.",
    groups: [
      g("Limits, as a share of the wage",
        r(PAY, "deductionOverallCapBps", "All deductions together"),
        r(PAY, "overpaymentCapBps", "Recovering an overpayment"),
        r(PAY, "courtDebtCapBps", "Court-ordered debt"),
        r(PAY, "violationCapBps", "A violation")),
      g("Limits, in days of wage a month",
        r(PAY, "violationCapDays", "A violation"),
        r(PAY, "damageCapDays", "Damage")),
      g("Agreement and order",
        r(PAY, "loanConsentRequired", "Loan needs written agreement"),
        r(PAY, "schemeConsentRequired", "Scheme needs written agreement"),
        r(PAY, "deductionOrder", "Order taken"),
        r(PAY, "deductionCapBase", "Limit measured on"),
        r(PAY, "capRoundingMode", "Limit rounded")),
    ] };
}

export function wpsPage(d: DemoData): PageSpec {
  const h = d.headline();
  const held = d.heldIds().length;
  return { title: "WPS and bank file",
    lede: "The settings of the monthly salary file. The bank checks the " +
      "file again when it is uploaded.",
    groups: [
      g("Salary file",
        { key: "wps:employer", label: "Employer",
          value: d.companyName.en },
        { key: "wps:format", label: "File",
          value: "WPS salary file, one per pay run",
          help: "Made from the pay run; downloaded on the Pay step." },
        { key: "wps:people", label: "People in this month's file",
          value: `${h.sifPeople} of ${h.headcount}` },
        { key: "wps:held", label: "Held out of the file",
          value: held === 0 ? "No one" : `${held} ${held === 1 ? "person"
            : "people"}`,
          help: "Pay for someone with no bank account stays out of " +
            "the file until an IBAN is entered." }),
      g("Checks before download",
        { key: "wps:iban", label: "IBAN",
          value: "Check digits",
          help: "An IBAN that fails its check digits stops the pay run." },
        { key: "wps:routing", label: "Bank routing code",
          value: "Looked up in a bundled table",
          help: "The demo bank's routing code is invented, so it is not " +
            "found in that table." }),
      g("Dates",
        r(DL, "wpsDueDayOfNextMonth", "Salary due"),
        r(DL, "wpsLateAlertDayOfNextMonth", "Late alert from"),
        r(DL, "wpsFinePerWorkerFils", "Fine per worker"),
        r(DL, "wpsFineCapFils", "Fine limit")),
    ] };
}

export function companyPage(d: DemoData): PageSpec {
  const people = d.people.people();
  const branches = new Set(people.map((p) => p.branch.en));
  return { title: "Company details",
    lede: "How the company is set up in this demo. The company is " +
      "fictional.",
    groups: [
      g("Company",
        { key: "co:name", label: "Name", value: d.companyName.en },
        { key: "co:people", label: "People on file",
          value: String(people.length) },
        { key: "co:depts", label: "Departments",
          value: String(d.departments().length) },
        { key: "co:branches", label: "Locations",
          value: [...branches].join(", ") }),
      g("Rules this company uses",
        { key: "co:scope", label: "Rule scope", value: d.basis().ruleSet.en },
        { key: "co:pension", label: "Pension for UAE nationals",
          value: "Not computed", help: d.basis().pension.en }),
    ] };
}

const cap = (x: string): string => `${x[0]?.toUpperCase() ?? ""}${x.slice(1)}`;

/** A payslip line's name as a person would say it. */
function elementName(label: string, code: string | null): string {
  if (code === "back-pay") return "Back pay";
  const plain = label.replace(/\s+[A-Z]{2}-\d+$/, "");
  const a = /^Allowance (.+)$/.exec(plain);
  return a === null ? plain : `${cap(a[1] ?? "")} allowance`;
}

/** What can appear on a payslip, read from this month's payslips. */
export function elementsPage(d: DemoData): PageSpec {
  const slips = d.people.people().flatMap((p) => {
    const s = d.people.payslip(p.id);
    return s === null ? [] : [s];
  });
  const seen = new Map<string, { name: string; group: string;
    count: number }>();
  for (const s of slips) {
    for (const l of s.lines) {
      const name = elementName(l.engineLabel, l.code);
      const hit = seen.get(name);
      if (hit === undefined) {
        seen.set(name, { name, group: l.group, count: 1 });
      } else {
        hit.count += 1;
      }
    }
  }
  const items = (group: string): ItemSpec[] => [...seen.values()]
    .filter((x) => x.group === group).map((x) => ({
      key: `el:${x.name}`, label: x.name,
      value: `On ${x.count} of ${slips.length} payslips` }));
  return { title: "Pay elements",
    lede: "Everything that appears on a payslip this month. How each " +
      "amount is worked out is shown on the payslip, figure by figure.",
    groups: [g("Earnings", ...items("earning")),
      g("Deductions", ...items("deduction"))] };
}

/** Who is paid together: the locations of the company. */
export function groupsPage(d: DemoData, lang: Lang): PageSpec {
  const by = new Map<string, number>();
  for (const p of d.people.people()) {
    by.set(p.branch.en, (by.get(p.branch.en) ?? 0) + 1);
  }
  const payday = formatDate(d.payCalendar().payday, lang);
  return { title: "Pay groups",
    lede: "People are paid together by location. All groups are paid " +
      "monthly.",
    groups: [g("Groups", ...[...by.entries()].map(([name, n]): ItemSpec => ({
      key: `pg:${name}`, label: name,
      value: `${n} ${n === 1 ? "person" : "people"}`,
      help: `Payday ${payday} (sample date).` })))] };
}
