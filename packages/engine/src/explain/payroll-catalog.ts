import { deepFreeze } from "../freeze";

/**
 * Payslip messages, keyed by trace line id without its "#code" suffix.
 * {in.x} is the line's input x; every message ends with its statuses.
 */
const R = " ({rules}).";

/** Payslip trace ids whose result is raw fils, shown as AED. */
export const PAYROLL_MONEY_IDS: readonly string[] = deepFreeze([
  "earn.basic", "earn.allowance", "earn.overtime.normal",
  "earn.overtime.night", "earn.rest-day", "earn.holiday",
  "earn.leave-encashment", "earn.gross", "gpssa.salary",
  "gpssa.employee-share", "gpssa.employer-gross", "gpssa.gov-support",
  "cap.base", "cap.overall",
  "ded.gpssa", "ded.overpayment", "ded.violation", "ded.damage",
  "ded.court-debt", "ded.scheme", "ded.loan", "ded.total", "pay.net",
  "employer.gpssa", "employer.total",
]);

export const PAYROLL_EN: Record<string, string> = deepFreeze({
  "payroll.period": "Pay period {in.payStart} to {in.payEnd}: {result} " +
    "days" + R,
  "payroll.days": "Paid share of the month in half-days: {result} " +
    "({in.unpaidDays} unpaid days, {in.halfPayDays} half-pay days)" + R,
  "leave.sick": "Sick leave this month: {in.fullPay} days full pay, " +
    "{in.halfPay} half pay, {in.unpaid} unpaid, {in.beyond} unpaid " +
    "beyond the legal limit, {in.probation} unpaid in probation" + R,
  "leave.maternity": "Maternity leave this month: {in.fullPay} days " +
    "full pay, {in.halfPay} half pay, {in.unpaid} unpaid, {in.beyond} " +
    "unpaid beyond the legal limit" + R,
  "earn.basic": "Basic salary for the period: {result}" + R,
  "earn.allowance": "Allowance {in.code}: {result}" + R,
  "earn.overtime.normal": "Overtime pay, {in.minutes} minutes: " +
    "{result}" + R,
  "earn.overtime.night": "Night overtime pay (22:00 to 04:00), " +
    "{in.minutes} minutes: {result}" + R,
  "earn.rest-day": "Pay for work on rest days ({in.days} paid, " +
    "{in.daysOff} days off in lieu): {result}" + R,
  "earn.holiday": "Pay for work on official holidays ({in.days} paid, " +
    "{in.daysOff} days off in lieu): {result}" + R,
  "earn.leave-encashment": "Annual leave paid in cash, {in.days} days: " +
    "{result}" + R,
  "earn.gross": "Gross pay: {result}" + R,
  "gpssa.salary": "Pension contribution salary (fixed in " +
    "{in.fixingMonth}): {result}" + R,
  "gpssa.employee-share": "Employee pension share this month: " +
    "{result}" + R,
  "gpssa.employer-gross": "Employer pension share before government " +
    "support: {result}" + R,
  "gpssa.gov-support": "Part of the employer share paid by the " +
    "government: {result}" + R,
  "cap.base": "Wage used for deduction limits: {result}" + R,
  "cap.overall": "Most that may be deducted this month " +
    "({in.capPercent} of the wage): {result}" + R,
  "ded.gpssa": "Pension contribution, employee share: {result}" + R,
  "ded.overpayment": "Recovery of an overpayment {in.ref}: {result}" + R,
  "ded.violation": "Deduction for violation {in.ref}: {result}" + R,
  "ded.damage": "Deduction for damage {in.ref}: {result}" + R,
  "ded.court-debt": "Court-ordered deduction {in.ref}: {result}" + R,
  "ded.scheme": "Deduction for a savings or welfare scheme {in.ref}: " +
    "{result}" + R,
  "ded.loan": "Loan repayment {in.ref}: {result}" + R,
  "ded.total": "Total deductions: {result}" + R,
  "pay.net": "Net pay: {result}" + R,
  "employer.gpssa": "Employer pension contribution payable: {result}" + R,
  "employer.total": "Employer cost on top of gross pay: {result}" + R,
});

// NEEDS NATIVE REVIEW: Arabic text below was authored by Claude and has
// not been confirmed by a native speaker. Amounts keep Western digits.
export const PAYROLL_AR: Record<string, string> = deepFreeze({
  "payroll.period": "فترة الراتب من {in.payStart} إلى {in.payEnd}: " +
    "{result} يومًا" + R,
  "payroll.days": "الحصة المدفوعة من الشهر بأنصاف الأيام: {result} " +
    "({in.unpaidDays} أيام بدون أجر، {in.halfPayDays} أيام بنصف أجر)" + R,
  "leave.sick": "الإجازة المرضية هذا الشهر: {in.fullPay} أيام بأجر " +
    "كامل، {in.halfPay} بنصف أجر، {in.unpaid} بدون أجر، {in.beyond} " +
    "بدون أجر بعد الحد القانوني، {in.probation} بدون أجر خلال فترة " +
    "التجربة" + R,
  "leave.maternity": "إجازة الوضع هذا الشهر: {in.fullPay} أيام بأجر " +
    "كامل، {in.halfPay} بنصف أجر، {in.unpaid} بدون أجر، {in.beyond} " +
    "بدون أجر بعد الحد القانوني" + R,
  "earn.basic": "الراتب الأساسي عن الفترة: {result}" + R,
  "earn.allowance": "البدل {in.code}: {result}" + R,
  "earn.overtime.normal": "أجر العمل الإضافي، {in.minutes} دقيقة: " +
    "{result}" + R,
  "earn.overtime.night": "أجر العمل الإضافي الليلي (من 22:00 إلى " +
    "04:00)، {in.minutes} دقيقة: {result}" + R,
  "earn.rest-day": "أجر العمل في أيام الراحة ({in.days} مدفوعة، " +
    "{in.daysOff} أيام راحة بديلة): {result}" + R,
  "earn.holiday": "أجر العمل في العطلات الرسمية ({in.days} مدفوعة، " +
    "{in.daysOff} أيام راحة بديلة): {result}" + R,
  "earn.leave-encashment": "بدل نقدي عن الإجازة السنوية، {in.days} " +
    "أيام: {result}" + R,
  "earn.gross": "إجمالي الراتب: {result}" + R,
  "gpssa.salary": "راتب حساب الاشتراك (المحدد في {in.fixingMonth}): " +
    "{result}" + R,
  "gpssa.employee-share": "حصة الموظف في الاشتراك هذا الشهر: " +
    "{result}" + R,
  "gpssa.employer-gross": "حصة صاحب العمل في الاشتراك قبل دعم " +
    "الحكومة: {result}" + R,
  "gpssa.gov-support": "الجزء الذي تتحمله الحكومة من حصة صاحب العمل: " +
    "{result}" + R,
  "cap.base": "الأجر الذي تُحسب عليه حدود الخصم: {result}" + R,
  "cap.overall": "أقصى ما يجوز خصمه هذا الشهر ({in.capPercent} من " +
    "الأجر): {result}" + R,
  "ded.gpssa": "اشتراك المعاش، حصة الموظف: {result}" + R,
  "ded.overpayment": "استرداد مبلغ مدفوع بالزيادة {in.ref}: {result}" + R,
  "ded.violation": "خصم بسبب مخالفة {in.ref}: {result}" + R,
  "ded.damage": "خصم بسبب إتلاف {in.ref}: {result}" + R,
  "ded.court-debt": "خصم بموجب حكم قضائي {in.ref}: {result}" + R,
  "ded.scheme": "خصم لصالح نظام ادخار أو رعاية {in.ref}: {result}" + R,
  "ded.loan": "سداد قرض {in.ref}: {result}" + R,
  "ded.total": "مجموع الخصومات: {result}" + R,
  "pay.net": "صافي الراتب: {result}" + R,
  "employer.gpssa": "اشتراك المعاش المستحق على صاحب العمل: {result}" + R,
  "employer.total": "تكلفة صاحب العمل فوق إجمالي الراتب: {result}" + R,
});
