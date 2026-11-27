import { accruedHalves, balanceHalves, PAYROLL_PACKS }
  from "@payroll/engine";
import { AS_OF, workingDaysBetween } from "./calendar";
import { PROBATION_SICK_DATE, UNPAID_DATES } from "./pay-inputs";
import { LEAVE_BASIS, leaveDaysOf, unusedLeaveAtExit } from "./settlement";
import type {
  CaseTag,
  DemoEmployee,
  DemoLeaveBalance,
  DemoLeaveRequest,
  DemoLeaveRule,
  DemoLeaveType,
  LeaveStatus,
} from "./types";

const PAY = PAYROLL_PACKS[0]?.params ?? {};
/** A day count from the payroll rule pack (DL 33 Arts 30 and 31). */
const pack = (key: string): number => {
  const v = PAY[key]?.value;
  if (typeof v !== "number") throw new Error(`no pack value ${key}`);
  return v;
};
const SICK = { full: pack("sickFullPayDays"), half: pack("sickHalfPayDays"),
  max: pack("sickMaxDays") };
const MAT = { full: pack("maternityFullPayDays"),
  half: pack("maternityHalfPayDays"),
  extra: pack("maternityUnpaidExtraDays") };

const LAW = (art: number): DemoLeaveRule["source"] => ({
  en: `Federal Decree-Law 33 of 2021, Article ${art}`,
  ar: `المرسوم بقانون اتحادي رقم 33 لسنة 2021، المادة ${art}` });
const POLICY = { en: "Company policy", ar: "سياسة الشركة" };
const none = { proof: null, proofFile: null, noticeDays: 0,
  minServiceYears: 0 };

/**
 * The leave a person can ask for, with the rule behind each. Sick and
 * maternity figures come from the payroll rule pack; parental,
 * bereavement and study leave are Article 32 as we read it (the pack
 * has no parameters for them yet). The Decree-Law has no Hajj leave,
 * so the demo offers none. Arabic: NEEDS NATIVE REVIEW.
 */
export const LEAVE_TYPES: readonly DemoLeaveType[] = [
  { id: "lt-annual", labelKey: "leave.annual", paid: true,
    annualDays: 30, rule: { ...none, maxDays: null, basis: "working",
      noticeDays: 7, source: POLICY,
      text: { en: "30 days a year on full pay, credited month by month. " +
        "Ask at least 7 days ahead.",
      ar: "30 يومًا في السنة بأجر كامل، تُضاف شهريًا. اطلبها قبل 7 " +
        "أيام على الأقل." } } },
  { id: "lt-sick", labelKey: "leave.sick", paid: true, annualDays: null,
    rule: { ...none, maxDays: SICK.max, basis: "calendar", source: LAW(31),
      proof: { en: "A medical report from a licensed doctor, within 3 days",
        ar: "تقرير طبي من طبيب مرخص خلال 3 أيام" },
      proofFile: "medical-report.pdf",
      text: { en: `Up to ${SICK.max} days a year: the first ${SICK.full} ` +
        `on full pay, the next ${SICK.half} on half pay, the rest ` +
        "unpaid. Not paid during probation.",
      ar: `حتى ${SICK.max} يومًا في السنة: أول ${SICK.full} بأجر كامل، ` +
        `ثم ${SICK.half} بنصف الأجر، والباقي بدون أجر. لا تُدفع خلال ` +
        "فترة التجربة." } } },
  { id: "lt-maternity", labelKey: "leave.maternity", paid: true,
    annualDays: null, rule: { ...none, maxDays: MAT.full + MAT.half,
      basis: "calendar", source: LAW(30),
      proof: { en: "A medical certificate with the expected date of birth",
        ar: "شهادة طبية بتاريخ الولادة المتوقع" },
      proofFile: "expected-birth-certificate.pdf",
      text: { en: `${MAT.full + MAT.half} days: the first ${MAT.full} on ` +
        `full pay, the next ${MAT.half} on half pay. Up to ${MAT.extra} ` +
        "more days unpaid after an illness from the pregnancy or birth.",
      ar: `${MAT.full + MAT.half} يومًا: أول ${MAT.full} بأجر كامل، ثم ` +
        `${MAT.half} بنصف الأجر. وحتى ${MAT.extra} يومًا إضافيًا بدون ` +
        "أجر عند مرض بسبب الحمل أو الولادة." } } },
  { id: "lt-parental", labelKey: "leave.parental", paid: true,
    annualDays: null, rule: { ...none, maxDays: 5, basis: "working",
      source: LAW(32),
      proof: { en: "The child's birth certificate",
        ar: "شهادة ميلاد الطفل" },
      proofFile: "birth-certificate.pdf",
      text: { en: "5 working days on full pay, for either parent, taken " +
        "within 6 months of the birth.",
      ar: "5 أيام عمل بأجر كامل لأي من الوالدين، خلال 6 أشهر من " +
        "الولادة." } } },
  { id: "lt-bereavement", labelKey: "leave.bereavement", paid: true,
    annualDays: null, rule: { ...none, maxDays: 5, basis: "calendar",
      source: LAW(32),
      text: { en: "5 days on full pay for a husband or wife; 3 days for a " +
        "parent, child, brother, sister, grandchild or grandparent.",
      ar: "5 أيام بأجر كامل لوفاة الزوج أو الزوجة؛ و3 أيام لوفاة أحد " +
        "الوالدين أو الأبناء أو الإخوة أو الأحفاد أو الأجداد." } } },
  { id: "lt-study", labelKey: "leave.study", paid: true, annualDays: null,
    rule: { ...none, maxDays: 10, basis: "working", minServiceYears: 2,
      source: LAW(32),
      proof: { en: "Your exam timetable", ar: "جدول الامتحانات" },
      proofFile: "exam-timetable.pdf",
      text: { en: "10 working days a year on full pay to sit exams, after " +
        "2 years with the company, at a school or university the UAE " +
        "recognises.",
      ar: "10 أيام عمل في السنة بأجر كامل لأداء الامتحانات، بعد سنتين " +
        "في الشركة، في مؤسسة تعليمية معترف بها في الدولة." } } },
  { id: "lt-unpaid", labelKey: "leave.unpaid", paid: false,
    annualDays: null, rule: { ...none, maxDays: null, basis: "working",
      source: POLICY,
      text: { en: "Agreed with your manager. The days are taken out of " +
        "the month's pay.",
      ar: "بالاتفاق مع مديرك. تُخصم الأيام من راتب الشهر." } } },
];

/** Company policy for the demo (not the law): 30 days a year,
 * credited monthly from the first month. */
export const ANNUAL_POLICY = { accrual: "monthly" as const,
  annualDays: 30, joiningYearProRata: true };

type Who = { tag: CaseTag } | { id: string };
type Plan = [Who, string, string, string, LeaveStatus, string];

const PLANS: readonly Plan[] = [
  [{ tag: "unpaid-leave" }, "lt-unpaid", UNPAID_DATES[0]!,
    UNPAID_DATES.at(-1)!, "approved", "reason.personal"],
  [{ tag: "probation" }, "lt-sick", PROBATION_SICK_DATE,
    PROBATION_SICK_DATE, "approved", "reason.medical"],
  [{ tag: "leaver" }, "lt-annual", "2026-04-06", "2026-04-10",
    "approved", "reason.travel"],
  [{ id: "emp-018" }, "lt-annual", "2026-11-16", "2026-11-20",
    "pending", "reason.family"],
  [{ id: "emp-006" }, "lt-annual", "2026-12-21", "2026-12-31",
    "pending", "reason.travel"],
  [{ id: "emp-031" }, "lt-annual", "2026-11-02", "2026-11-04",
    "rejected", "reason.rest"],
];

const halves = (from: string, to: string) =>
  workingDaysBetween(from, to).length * 2;

function whoOf(es: DemoEmployee[], w: Who): string {
  const e = "tag" in w ? es.find((x) => x.cases.includes(w.tag))
    : es.find((x) => x.id === w.id);
  if (e === undefined) throw new Error("leave plan names no employee");
  return e.id;
}

export function buildLeaveRequests(employees: DemoEmployee[])
  : DemoLeaveRequest[] {
  return PLANS.map(([who, leaveTypeId, startDate, endDate, status,
    reasonKey], i) => ({ id: `lr-${String(i + 1).padStart(3, "0")}`,
    employeeId: whoOf(employees, who), leaveTypeId, startDate, endDate,
    halves: halves(startDate, endDate), status, reasonKey }));
}

function balanceOf(e: DemoEmployee, reqs: DemoLeaveRequest[])
  : DemoLeaveBalance {
  const asOf = e.leavingDate !== null && e.leavingDate < AS_OF
    ? e.leavingDate : AS_OF;
  const mine = reqs.filter((r) => r.employeeId === e.id &&
    r.leaveTypeId === "lt-annual" && r.startDate.startsWith("2026"));
  const accrued = accruedHalves(ANNUAL_POLICY, e.joiningDate, 2026, asOf);
  const taken = mine.filter((r) => r.status === "approved")
    .map((r) => ({ date: r.startDate, halves: r.halves }));
  const pendingHalves = mine.filter((r) => r.status === "pending")
    .reduce((s, r) => s + r.halves, 0);
  const b = balanceHalves({ accruedHalves: accrued, carriedHalves: 0,
    carriedExpiresOn: null, adjustmentHalves: 0, taken, pendingHalves,
    asOf });
  const exit = e.leavingDate !== null && e.leavingDate <= AS_OF;
  if (exit) {
    // The same function as the settlement, so the two cannot differ.
    const days = leaveDaysOf(unusedLeaveAtExit(e, reqs,
      ANNUAL_POLICY.annualDays));
    return { employeeId: e.id, leaveTypeId: "lt-annual", year: 2026,
      accruedHalves: accrued, takenHalves: b.takenHalves, pendingHalves,
      availableHalves: null, availableDays: days, basis: LEAVE_BASIS };
  }
  return { employeeId: e.id, leaveTypeId: "lt-annual", year: 2026,
    accruedHalves: accrued, takenHalves: b.takenHalves, pendingHalves,
    availableHalves: b.availableHalves,
    availableDays: b.availableHalves / 2, basis: null };
}

/** Annual leave balances from the engine, for everyone already joined. */
export function buildLeaveBalances(employees: DemoEmployee[],
  reqs: DemoLeaveRequest[]): DemoLeaveBalance[] {
  return employees.filter((e) => e.joiningDate <= AS_OF)
    .map((e) => balanceOf(e, reqs));
}
