// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
import { bonusStatus } from "../../demo/bonus-state";
import { commissionStatus } from "../../demo/commission-state";
import type { Area, AreaRoute, NavCtx } from "../types";

/** Bonus runs (R13) and sales commission statements (P66). */
const HR_GM = ["hr", "gm"] as const;
const pay = (...rest: string[]): AreaRoute =>
  ({ section: "pay-run", rest });

/** Runs waiting for the viewer: HR sends drafts, the GM signs off. */
const bonusWaiting = (c: NavCtx): number => c.state.bonusRuns.filter((r) =>
  bonusStatus(r) === (c.state.role === "gm" ? "waiting" : "draft")).length;

/** The month's statements waiting for the GM's sign off. */
const commissionWaiting = (c: NavCtx): number =>
  c.state.role !== "gm" ? 0 : Object.values(c.state.commissionMonths)
    .filter((m) => commissionStatus(m) === "waiting").length;

export const AREAS: readonly Area[] = [
  { id: "pay.bonus", section: "pay", group: "month",
    label: { en: "Bonus runs", ar: "دورات المكافآت" },
    status: "live", archetype: "LF", roles: HR_GM, route: pay("bonus"),
    count: bonusWaiting,
    keywords: "R13 bonus run off cycle performance q3 extra pay " +
      "sign off" },
  { id: "pay.commission", section: "pay", group: "changes",
    label: { en: "Sales commission", ar: "عمولات المبيعات" },
    status: "live", archetype: "LF", roles: HR_GM, route: pay("commission"),
    count: commissionWaiting,
    keywords: "P66 sales commission statement target attainment tier " +
      "clawback relationship manager" },
];
