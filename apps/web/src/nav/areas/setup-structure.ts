// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
import type { Area } from "../types";

const HR_GM = ["hr", "gm"] as const;

const area = (id: string, group: string, en: string, ar: string,
  archetype: Area["archetype"], page: string[], keywords: string): Area =>
  ({ id, section: "setup", group, label: { en, ar }, status: "live",
    archetype, roles: HR_GM, route: { section: "setup",
      rest: ["structure", ...page] }, keywords });

/**
 * WP11: Setup, structure (navigation map rows S01 to S06, S17, S18,
 * T07). Each screen reads the demo data's selectors; none keeps a
 * figure of its own. Routes are `#/setup/structure/<page>`. IT reaches
 * every Setup area HR does (roleAllows in nav/registry.ts).
 */
export const AREAS: readonly Area[] = [
  area("setup.jobs", "people", "Jobs and grades", "الوظائف والدرجات",
    "RT", ["jobs"], "job title grade band pay range catalogue"),
  area("setup.documents", "people", "Document types",
    "أنواع المستندات والتذكيرات", "ST", ["documents"],
    "visa passport emirates id expiry reminder window"),
  area("setup.letters", "people", "Letter templates",
    "قوالب الخطابات", "LF", ["letters"],
    "salary certificate noc experience letter wording preview"),
  area("setup.checklists", "people", "Checklist templates",
    "قوالب قوائم المهام", "LF", ["checklists"],
    "joiner leaver onboarding offboarding steps"),
  area("setup.kpis", "people", "KPI library",
    "مكتبة المؤشرات والفترات", "RT", ["kpis"],
    "goal target appraisal review period performance"),
  area("setup.sign-off", "access", "Sign-off levels",
    "مستويات اعتماد الطلبات", "LF", ["sign-off"],
    "who signs off request limit expense pay run level"),
  area("setup.exemptions", "pay", "Pay exclusions",
    "استثناءات الرواتب", "LF", ["exemptions"],
    "left out held back pension gratuity probation exclusion"),
  area("setup.devices", "time", "Attendance devices",
    "أجهزة الحضور", "LF", ["devices"],
    "reader phone punch clock feed unmatched"),
  area("setup.public-holidays", "time", "Holiday calendar",
    "العطل الرسمية", "CA", ["holidays"],
    "eid national day new year sample dates calendar"),
];
