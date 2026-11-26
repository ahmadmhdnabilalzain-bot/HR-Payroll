// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
import type { Area } from "../types";

const HR_GM = ["hr", "gm"] as const;

/** R41 and P22: the pay-structure sandbox, the referral ledger. */
export const AREAS: readonly Area[] = [
  { id: "pay.sandbox", section: "pay", group: "changes",
    label: { en: "Pay-structure sandbox", ar: "تجربة هيكل الرواتب" },
    status: "live", archetype: "FA", roles: HR_GM,
    route: { section: "pay-run", rest: ["more", "sandbox"] },
    keywords: "R41 sandbox what if pay structure draft plan housing " +
      "allowance transport overtime rate raise recompute october" },
  { id: "people.referrals", section: "people", group: "hiring",
    label: { en: "Referrals and agencies", ar: "الإحالات والوكالات" },
    status: "live", archetype: "LF", roles: HR_GM,
    route: { section: "people", rest: ["moves", "referrals"] },
    keywords: "P22 referral and agency ledger bonus fee recruiter " +
      "candidate hired probation payable 90 days mark payable " +
      "outstanding" },
];
