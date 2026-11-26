import type { Area, AreaRoute } from "../types";

/** R43 anomaly checks, X12 report templates (P20 is hiring.ts). */
const HR_GM = ["hr", "gm"] as const;
const rep = (id: string): AreaRoute => ({ section: "reports", rest: [id] });

export const AREAS: readonly Area[] = [
  { id: "reports.anomalies", section: "reports", group: "analysis",
    label: { en: "Anomaly checks", ar: "فحوصات الاستثناءات" },
    status: "live", archetype: "LF", roles: HR_GM, route: rep("anomalies"),
    count: (c) => c.data.checks.anomalies(Object.keys(c.state.ibans))
      .findings.filter((f) => c.state.checkMarks[f.id] === undefined)
      .length,
    keywords: "R43 anomaly checks unusual swing duplicate iban new " +
      "payee overtime bank details salary change rules" },
  { id: "reports.templates", section: "reports", group: "analysis",
    label: { en: "Report templates", ar: "قوالب التقارير" },
    status: "live", archetype: "RP", roles: HR_GM, route: rep("templates"),
    keywords: "X12 report templates library saved views my view " +
      "summary variance headcount cost centre leave salary file" },
];
