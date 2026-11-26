import type { Area } from "../types";

/** WP12: gratuity provision and employer cost (UAE only). */
const HR_GM = ["hr", "gm"] as const;
const rep = (id: string) => ({ section: "reports" as const, rest: [id] });

export const AREAS: readonly Area[] = [
  { id: "pay.gratuity-provision", section: "pay", group: "owed",
    label: { en: "Gratuity provision", ar: "مخصص نهاية الخدمة" },
    status: "live", archetype: "LF", roles: HR_GM,
    route: rep("gratuity-provision"),
    keywords: "gratuity end of service liability accrued provision " +
      "estimate" },
  { id: "reports.gratuity-liability", section: "reports",
    group: "finance", label: { en: "Gratuity liability",
      ar: "التزامات نهاية الخدمة" }, status: "live", archetype: "RP",
    roles: HR_GM, route: rep("gratuity-liability"),
    keywords: "gratuity liability department total accrued" },
  { id: "reports.employer-cost", section: "reports", group: "pay",
    label: { en: "Employer cost", ar: "تكلفة صاحب العمل" },
    status: "live", archetype: "RP", roles: HR_GM,
    route: rep("employer-cost"),
    keywords: "employer cost gross pension iloe insurance costing" },
];
// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
