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

export const AREAS: readonly Area[] = [
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
];
