import type { Area } from "../types";

/**
 * WP22: auditor access (S25), the inspection pack with the auditor's
 * view (X33) and the error-remedy record (X37). HR and the General
 * manager see the reports; the IT manager also reaches auditor access.
 */
export const AREAS: readonly Area[] = [
  { id: "setup.auditor", section: "setup", group: "access",
    label: { en: "Auditor access", ar: "وصول المدقق" }, status: "live",
    archetype: "ST", roles: ["hr", "gm", "it"],
    route: { section: "setup", rest: ["auditor"] },
    keywords: "S25 external auditor read only time limit expires view log" },
  { id: "reports.inspection", section: "reports", group: "analysis",
    label: { en: "Inspection pack", ar: "ملف التفتيش" }, status: "live",
    archetype: "RP", roles: ["hr", "gm"],
    route: { section: "reports", rest: ["inspection"] },
    keywords: "X33 inspector evidence pdf register sign-offs audit chain " +
      "policy versions auditor room not a filing" },
  { id: "reports.error-remedies", section: "reports", group: "analysis",
    label: { en: "Error-remedy record", ar: "سجل تصحيح الأخطاء" },
    status: "live", archetype: "LF", roles: ["hr", "gm"],
    route: { section: "reports", rest: ["error-remedies"] },
    keywords: "X37 payroll error correction who found fix pay run" },
];
