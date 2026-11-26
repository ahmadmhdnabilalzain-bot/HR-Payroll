// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
import type { Area, AreaRoute } from "../types";

/**
 * WP19: the sweep of Pay, Reports and Setup rows no other package
 * built (owner brief, board pack, loans report, IT dashboard, and the
 * Pay and Setup rows below). UAE only; no screen here claims an
 * authority's decision.
 */
const HR_GM = ["hr", "gm"] as const;
const rep = (id: string): AreaRoute =>
  ({ section: "reports", rest: [id] });

const more = (...rest: string[]): AreaRoute =>
  ({ section: "pay-run", rest: ["more", ...rest] });

const set = (page: string): AreaRoute =>
  ({ section: "setup", rest: ["more", page] });

export const AREAS: readonly Area[] = [
  { id: "pay.exit", section: "pay", group: "owed",
    label: { en: "People leaving", ar: "المغادرون وإنهاء الخدمة" },
    status: "live", archetype: "SF", roles: HR_GM, route: more("exit"),
    keywords: "R34 exit flow resignation last day notice leaver legal " +
      "flags settlement checks" },
  { id: "reports.owner-brief", section: "reports", group: "people",
    label: { en: "Owner brief", ar: "موجز المالك" },
    status: "live", archetype: "RP", roles: HR_GM, route: rep("owner-brief"),
    keywords: "X25 weekly pack owner general manager week to do" },
  { id: "reports.board-pack", section: "reports", group: "people",
    label: { en: "Board pack", ar: "حزمة مجلس الإدارة" },
    status: "live", archetype: "RP", roles: ["gm"], route: rep("board-pack"),
    keywords: "X26 board directors year to date figures" },
  { id: "reports.loans", section: "reports", group: "pay",
    label: { en: "Loans report", ar: "تقرير القروض" },
    status: "live", archetype: "RP", roles: HR_GM, route: rep("loans"),
    keywords: "X11 loans advances owed balance instalment" },
  { id: "reports.it-dashboard", section: "reports", group: "people",
    label: { en: "IT dashboard", ar: "لوحة تقنية المعلومات" },
    status: "live", archetype: "RP", roles: ["hr", "gm", "it"],
    route: rep("it-dashboard"),
    keywords: "X24 access keys webhooks audit chain import sign-in" },
  { id: "setup.whatsapp", section: "setup", group: "connections",
    label: { en: "Decisions by WhatsApp", ar: "القرارات عبر واتساب" },
    status: "live", archetype: "ST", roles: HR_GM, route: set("whatsapp"),
    keywords: "S32 whatsapp approvals message reply manager phone" },
  { id: "setup.calendar-feeds", section: "setup", group: "connections",
    label: { en: "Calendar feeds", ar: "تقويمات الاشتراك" },
    status: "live", archetype: "ST", roles: HR_GM, route: set("calendar"),
    keywords: "S34 calendar feed ics outlook google leave holidays" },
  { id: "setup.email-in", section: "setup", group: "connections",
    label: { en: "Email in", ar: "البريد الوارد إلى السجلات" },
    status: "live", archetype: "ST", roles: HR_GM, route: set("email-in"),
    keywords: "S33 email in inbox letters bank letter medical certificate" },
];
