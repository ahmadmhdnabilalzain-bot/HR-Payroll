// NEEDS NATIVE REVIEW: the Arabic short names are authored by Claude.
import type { Lang } from "../i18n/types";
import type { Area } from "./types";

/**
 * Plain short names for the panel and the group tabs, where the full
 * registry label is long ("Hiring: requisitions" is "Requisitions").
 * Search and page titles keep the full label. Areas not listed show
 * their label as is.
 */
const SHORT: Record<string, { en: string; ar: string }> = {
  "people.everyone": { en: "Everyone", ar: "الجميع" },
  "people.overview": { en: "Overview", ar: "نظرة عامة" },
  "people.org": { en: "Org chart", ar: "الهيكل التنظيمي" },
  "people.positions": { en: "Positions", ar: "الوظائف" },
  "people.sites": { en: "Group staff", ar: "موظفو المجموعة" },
  "people.centres": { en: "Cost centres", ar: "مراكز التكلفة" },
  "people.requisitions": { en: "Requisitions", ar: "طلبات الشغور" },
  "people.board": { en: "Candidates", ar: "المرشحون" },
  "people.offers": { en: "Offers", ar: "العروض" },
  "people.vacancies": { en: "Vacancies", ar: "الشواغر" },
  "people.probation": { en: "Probation", ar: "فترة التجربة" },
  "people.joiners": { en: "Joiners", ar: "المنضمون" },
  "people.leavers": { en: "Leavers", ar: "المغادرون" },
  "people.transfers": { en: "Transfers", ar: "النقل" },
  "people.end": { en: "End employment", ar: "إنهاء الخدمة" },
  "people.staff-requests": { en: "Staff requests", ar: "طلبات الموظفين" },
  "people.letters": { en: "Letters", ar: "الخطابات" },
  "people.expiring": { en: "Expiring", ar: "تنتهي قريبًا" },
  "people.visas": { en: "Visas", ar: "التأشيرات" },
  "people.warnings": { en: "Warnings", ar: "الإنذارات" },
  "people.compliance": { en: "Checks", ar: "الفحوص" },
  "people.calendar": { en: "Calendar", ar: "التقويم" },
  "people.emiratisation": { en: "Emiratisation", ar: "التوطين" },
  "people.pension": { en: "Pension", ar: "المعاش" },
  "people.appraisals": { en: "Appraisals", ar: "التقييمات" },
  "people.goals": { en: "Goals", ar: "الأهداف" },
  "people.performance": { en: "Departments", ar: "الأقسام" },
  "time.requests": { en: "Requests", ar: "الطلبات" },
  "time.balances": { en: "Balances", ar: "الأرصدة" },
  "time.today": { en: "Today", ar: "اليوم" },
  "time.register": { en: "Register", ar: "السجل" },
  "time.punches": { en: "Punches", ar: "البصمات" },
  "time.roster": { en: "Rosters", ar: "المناوبات" },
  "time.plan": { en: "Planning", ar: "التخطيط" },
  "time.against": { en: "Late and absent", ar: "التأخر والغياب" },
  "time.overtime": { en: "To decide", ar: "للقرار" },
  "time.crew": { en: "Crew", ar: "الطاقم" },
  "pay.run": { en: "Pay run", ar: "دورة الرواتب" },
  "pay.approve": { en: "Sign-off", ar: "التوقيع" },
  "pay.file": { en: "Salary file", ar: "ملف الرواتب" },
  "pay.runs": { en: "Past runs", ar: "الدورات السابقة" },
  "pay.offcycle": { en: "Off-cycle", ar: "خارج الدورة" },
  "pay.corrections": { en: "Corrections", ar: "التصحيحات" },
  "pay.revisions": { en: "Revisions", ar: "المراجعات" },
  "pay.expenses": { en: "Expenses", ar: "المصروفات" },
  "pay.fines": { en: "Fines", ar: "المخالفات" },
  "pay.deductions": { en: "Deductions", ar: "الاستقطاعات" },
  "pay.loans": { en: "Loans", ar: "القروض" },
  "pay.settlements": { en: "Settlements", ar: "التسويات" },
  "reports.variance": { en: "Variance", ar: "الفروقات" },
  "reports.files": { en: "File register", ar: "سجل الملفات" },
  "reports.nationality": { en: "Nationality", ar: "الجنسية" },
  "reports.documents": { en: "Documents", ar: "المستندات" },
  "reports.headcount": { en: "Headcount", ar: "عدد الموظفين" },
  "reports.leave": { en: "Leave", ar: "الإجازات" },
  "reports.dashboard-hr": { en: "HR dashboard", ar: "لوحة الموارد" },
  "reports.dashboard-exec": { en: "Executive", ar: "التنفيذية" },
  "setup.rule-packs": { en: "Rules", ar: "القواعد" },
  "setup.leave": { en: "Leave", ar: "الإجازات" },
  "setup.hours": { en: "Hours", ar: "الساعات" },
  "setup.holidays": { en: "Holidays", ar: "العطل" },
  "setup.eos": { en: "End of service", ar: "نهاية الخدمة" },
  "setup.deductions": { en: "Deductions", ar: "الاستقطاعات" },
  "setup.calendar": { en: "Pay calendar", ar: "تقويم الرواتب" },
  "setup.wps": { en: "WPS file", ar: "ملف WPS" },
  "setup.company": { en: "Company", ar: "الشركة" },
  "setup.users": { en: "Users", ar: "المستخدمون" },
  "setup.who": { en: "Permissions", ar: "الصلاحيات" },
  "setup.rules": { en: "Sign-off rules", ar: "قواعد الاعتماد" },
  "setup.separation": { en: "Duties", ar: "فصل المهام" },
  "setup.signin": { en: "Sign-in", ar: "الدخول" },
  "setup.review": { en: "Access review", ar: "مراجعة الصلاحيات" },
  "setup.keys": { en: "API keys", ar: "مفاتيح API" },
  "setup.hooks": { en: "Webhooks", ar: "Webhooks" },
  "setup.import": { en: "Import", ar: "الاستيراد" },
  "setup.location": { en: "Data location", ar: "موقع البيانات" },
  "setup.paygroups": { en: "Pay groups", ar: "مجموعات الرواتب" },
  "setup.payelements": { en: "Pay elements", ar: "عناصر الرواتب" },
};

/** The area's short name, else its label. */
export function shortOf(a: Area, lang: Lang): string {
  return SHORT[a.id]?.[lang] ?? a.label[lang];
}

/**
 * Counts that are not "waiting for a decision": totals and open work
 * in progress (everyone on the payroll, open positions, goals set,
 * appraisals in a cycle, candidates in the process, today's register,
 * compliance items to look at, documents running out, open incidents,
 * insurance cards with the insurer, ILOE subscriptions due, overdue
 * training, punches to match, draft roster weeks, salaries on hold,
 * help desk tickets to answer, and answers back to the employee). The
 * panel's waiting column leaves them out; the area pages still show
 * them.
 */
const NOT_A_DECISION = new Set([
  "people.everyone", "people.positions", "people.goals",
  "people.appraisals", "people.board", "people.compliance", "time.today",
  "me.documents", "people.expiring", "people.incidents",
  "people.insurance", "people.iloe", "people.training", "time.punches",
  "time.plan", "pay.hold", "people.helpdesk", "requests.asks",
]);

export function isDecision(a: Area): boolean {
  return !NOT_A_DECISION.has(a.id);
}
