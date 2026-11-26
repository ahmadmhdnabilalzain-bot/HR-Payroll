// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
import { approvalBlockedBy, runApprovalId } from "../../demo/derive";
import { personFor, requestRows } from "../../demo/time-off";
import type { Area, NavCtx } from "../types";

/** Leave requests waiting for the viewer (HR sees every waiting one). */
function waitingLeave(c: NavCtx): number {
  const me = personFor(c.data, c.state.role);
  const all = c.state.role === "hr" || c.state.role === "gm";
  return requestRows(c.data, c.state).filter((r) => r.state === "waiting" &&
    (all || r.approverId === me || r.employeeId === me)).length;
}

const HR_GM = ["hr", "gm"] as const;
const STAFF = ["manager", "employee"] as const;
const me = (c: NavCtx): string => personFor(c.data, c.state.role);

/**
 * The areas built in the first demo (Home, Pay run, People, Time off,
 * Reports), owned by WP1. Area packages add theirs in their own file.
 */
export const CORE_AREAS: readonly Area[] = [
  { id: "people.everyone", section: "people", group: "team",
    label: { en: "Everyone", ar: "الجميع" }, status: "live",
    archetype: "LF", route: { section: "people" }, roles: HR_GM,
    count: (c) => c.data.people.people().length,
    keywords: "staff employees list directory" },
  { id: "people.expiring", section: "people", group: "papers",
    label: { en: "Documents expiring", ar: "مستندات تنتهي صلاحيتها" },
    status: "live", archetype: "RP", roles: HR_GM,
    route: { section: "reports", rest: ["documents"] },
    count: (c) => c.data.documents().filter((d) => d.daysLeft <= 30).length,
    keywords: "visa passport emirates id expiry" },
  { id: "time.requests", section: "time", group: "leave",
    label: { en: "Leave requests", ar: "طلبات الإجازة" }, status: "live",
    archetype: "custom", route: { section: "time-off" },
    count: waitingLeave, keywords: "leave holiday vacation time off" },
  { id: "pay.run", section: "pay", group: "month",
    label: { en: "Pay run: review, fix, approve", ar: "دورة الرواتب" },
    status: "live", archetype: "SF", roles: HR_GM,
    route: { section: "pay-run", rest: ["review"] },
    count: (c) => approvalBlockedBy(c.data, c.state).length, stopsPay: true,
    keywords: "payroll run approve salary" },
  { id: "pay.approve", section: "pay", group: "month",
    label: { en: "Approval", ar: "الاعتماد" }, status: "live",
    archetype: "SF", roles: HR_GM,
    route: { section: "pay-run", rest: ["approve"] },
    count: (c) => {
      const id = runApprovalId(c.data);
      return id !== null && c.state.decided[id] === undefined ? 1 : 0;
    }, keywords: "approve sign off maker checker" },
  { id: "pay.file", section: "pay", group: "month",
    label: { en: "Salary file", ar: "ملف الرواتب" }, status: "live",
    archetype: "SF", roles: HR_GM,
    route: { section: "pay-run", rest: ["pay"] },
    keywords: "wps sif bank file" },
  { id: "pay.myslip", section: "pay", group: "month",
    label: { en: "My payslip", ar: "قسيمة راتبي" }, status: "live",
    archetype: "RT", roles: STAFF,
    route: (c) => ({ section: "people", rest: [me(c), "payslip"] }),
    keywords: "payslip salary net" },
  { id: "reports.summary", section: "reports", group: "pay",
    label: { en: "Payroll summary", ar: "ملخص الرواتب" }, status: "live",
    archetype: "RP", roles: HR_GM,
    route: { section: "reports", rest: ["summary"] },
    keywords: "register report" },
  { id: "reports.departments", section: "reports", group: "pay",
    label: { en: "Cost by department", ar: "التكلفة حسب القسم" },
    status: "live", archetype: "RP", roles: HR_GM,
    route: { section: "reports", rest: ["departments"] } },
  { id: "reports.files", section: "reports", group: "pay",
    label: { en: "Salary file register", ar: "سجل ملفات الرواتب" },
    status: "live", archetype: "RP", roles: HR_GM,
    route: { section: "reports", rest: ["files"] }, keywords: "wps sif" },
  { id: "reports.nationality", section: "reports", group: "people",
    label: { en: "Headcount by nationality", ar: "العدد حسب الجنسية" },
    status: "live", archetype: "RP", roles: HR_GM,
    route: { section: "reports", rest: ["nationality"] },
    keywords: "emiratisation nationals" },
  { id: "reports.documents", section: "reports", group: "people",
    label: { en: "Documents expiring report", ar: "تقرير المستندات" },
    status: "live", archetype: "RP", roles: HR_GM,
    route: { section: "reports", rest: ["documents"] } },
  { id: "requests.leave", section: "requests", group: "mine",
    label: { en: "Leave requests", ar: "طلبات الإجازة" }, status: "live",
    archetype: "custom", roles: STAFF, route: { section: "time-off" },
    count: waitingLeave },
  { id: "me.profile", section: "me", group: "mine",
    label: { en: "My profile", ar: "ملفي" }, status: "live",
    archetype: "RT", roles: STAFF,
    route: (c) => ({ section: "people", rest: [me(c)] }) },
  { id: "me.payslip", section: "me", group: "mine",
    label: { en: "My payslip", ar: "قسيمة راتبي" }, status: "live",
    archetype: "RT", roles: STAFF,
    route: (c) => ({ section: "people", rest: [me(c), "payslip"] }) },
];
