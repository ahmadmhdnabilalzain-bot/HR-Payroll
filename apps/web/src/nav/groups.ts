// NEEDS NATIVE REVIEW: the Arabic group names are authored by Claude.
import type { Group, SectionId } from "./types";

const g = (section: SectionId, id: string, en: string, ar: string)
  : Group => ({ id, section, label: { en, ar } });

/**
 * The panel groups, in showing order (navigation map, section 2). A
 * group with no live area is not shown. Area packages use these ids;
 * a new group is added here by WP1 only.
 */
export const GROUPS: readonly Group[] = [
  g("people", "team", "Team", "الفريق"),
  g("people", "hiring", "Hiring", "التوظيف"),
  g("people", "moves", "Joining and leaving", "الانضمام والمغادرة"),
  g("people", "requests", "Requests and letters", "الطلبات والخطابات"),
  g("people", "papers", "Documents and visas", "المستندات والتأشيرات"),
  g("people", "compliance", "Compliance and safety", "الامتثال والسلامة"),
  g("people", "growth", "Growth", "التطوير"),
  g("time", "leave", "Leave", "الإجازات"),
  g("time", "attendance", "Attendance", "الحضور"),
  g("time", "rosters", "Rosters", "المناوبات"),
  g("time", "overtime", "Overtime", "العمل الإضافي"),
  g("pay", "month", "This month", "هذا الشهر"),
  g("pay", "changes", "Changes", "التغييرات"),
  g("pay", "owed", "Owed and leaving", "المستحقات والمغادرة"),
  g("reports", "pay", "Pay reports", "تقارير الرواتب"),
  g("reports", "people", "People and dashboards", "الموظفون ولوحات المتابعة"),
  g("reports", "finance", "Finance links", "روابط المالية"),
  g("reports", "analysis", "Analysis and trail", "التحليل والسجل"),
  g("setup", "people", "People rules", "قواعد الموظفين"),
  g("setup", "time", "Time rules", "قواعد الوقت"),
  g("setup", "pay", "Pay rules", "قواعد الرواتب"),
  g("setup", "access", "Access and sign-off", "الصلاحيات والموافقات"),
  g("setup", "connections", "Connections", "الربط"),
  g("setup", "data", "Data and company", "البيانات والشركة"),
  g("requests", "mine", "Requests", "الطلبات"),
  g("me", "mine", "Me", "أنا"),
];
