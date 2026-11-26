import type { Area } from "../types";

/** X34: ask for a report in words (rule-based matching). */
export const AREAS: readonly Area[] = [
  { id: "reports.ask", section: "reports", group: "analysis",
    label: { en: "Ask for reports", ar: "اطلب تقريرا" },
    status: "live", archetype: "RP", roles: ["hr", "gm"],
    route: { section: "reports", rest: ["ask"] },
    keywords: "X34 ask for a report in words type say find show " +
      "variance headcount overtime" },
];
