// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
import type { Area, AreaRoute } from "../types";

/** WP16: pay checks, what-if, advice, holds, finance reports, setup. */
const HR_GM = ["hr", "gm"] as const;
const gate = (...rest: string[]): AreaRoute =>
  ({ section: "pay-run", rest: ["gate", ...rest] });
const rep = (id: string): AreaRoute => ({ section: "reports", rest: [id] });
const mig = (id: string): AreaRoute =>
  ({ section: "setup", rest: ["migration", id] });

export const AREAS: readonly Area[] = [
  { id: "pay.gate", section: "pay", group: "month",
    label: { en: "Checks before pay", ar: "فحوصات قبل الصرف" },
    status: "live", archetype: "RP", roles: HR_GM, route: gate(),
    keywords: "R15 pre-pay gate checks stop pass iban variance " +
      "corrections contract" },
  { id: "pay.what-if", section: "pay", group: "month",
    label: { en: "What-if", ar: "ماذا لو" },
    status: "live", archetype: "FA", roles: HR_GM, route: gate("what-if"),
    keywords: "R09 what if replay owner view basic overtime recompute" },
  { id: "pay.advice", section: "pay", group: "month",
    label: { en: "Bank advice", ar: "إشعار البنك" },
    status: "live", archetype: "RP", roles: HR_GM, route: gate("advice"),
    keywords: "R12 bank advice payment list salary file print" },
  { id: "pay.hold", section: "pay", group: "changes",
    label: { en: "Salary hold", ar: "إيقاف الراتب" },
    status: "live", archetype: "FA", roles: HR_GM, route: gate("holds"),
    count: (c) => c.state.salaryHolds.length,
    keywords: "R14 salary hold stop withhold release" },
  { id: "reports.elements", section: "reports", group: "pay",
    label: { en: "Pay elements report", ar: "تقرير عناصر الرواتب" },
    status: "live", archetype: "RP", roles: HR_GM, route: rep("elements"),
    keywords: "X06 elements element variance basic housing allowance" },
  { id: "reports.journal", section: "reports", group: "finance",
    label: { en: "Payroll journal", ar: "قيود الرواتب" },
    status: "live", archetype: "RP", roles: HR_GM, route: rep("journal"),
    keywords: "X08 journal debit credit finance accounting view" },
  { id: "reports.analysis", section: "reports", group: "analysis",
    label: { en: "Analysis builder", ar: "منشئ التحليل" },
    status: "live", archetype: "RP", roles: HR_GM, route: rep("analysis"),
    keywords: "X30 analysis builder group by measure chart pivot" },
  { id: "reports.sign-offs", section: "reports", group: "analysis",
    label: { en: "Sign-off report", ar: "تقرير الاعتمادات" },
    status: "live", archetype: "RP", roles: HR_GM, route: rep("sign-offs"),
    keywords: "X32 approval report who signed off declined waiting" },
  { id: "setup.parallel", section: "setup", group: "data",
    label: { en: "Compare old payroll", ar: "مقارنة التشغيل الموازي" },
    status: "live", archetype: "RP", roles: HR_GM,
    route: mig("parallel"),
    keywords: "S38 parallel run compare keka old system migration" },
  { id: "setup.custom-fields", section: "setup", group: "people",
    label: { en: "Custom fields", ar: "الحقول المخصصة" },
    status: "live", archetype: "ST", roles: HR_GM, route: mig("fields"),
    keywords: "S08 custom fields extra employee fields" },
];
