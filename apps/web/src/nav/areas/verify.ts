// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
import type { Area, AreaRoute } from "../types";

const HR_GM = ["hr", "gm"] as const;
const verify = (...rest: string[]): AreaRoute =>
  ({ section: "people", rest: ["verify", ...rest] });

/** WP27: verifiable letters (P34) and document intake (P54). */
export const AREAS: readonly Area[] = [
  { id: "people.letter-codes", section: "people", group: "requests",
    label: { en: "Verifiable letters", ar: "الخطابات القابلة للتحقق" },
    status: "live", archetype: "FA", roles: HR_GM, route: verify("letters"),
    keywords: "P34 verify letter code salary certificate noc check bank" },
  { id: "people.letter-check", section: "people", group: "requests",
    label: { en: "Check a letter", ar: "التحقق من خطاب" },
    status: "live", archetype: "FA", route: verify("check"),
    keywords: "P34 check verify letter code reference bank landlord" },
  { id: "people.doc-intake", section: "people", group: "papers",
    label: { en: "Document intake", ar: "استلام المستندات" },
    status: "live", archetype: "FA", roles: HR_GM, route: verify("intake"),
    keywords: "P54 intake scan scanned document email upload received " +
      "filed provenance" },
  { id: "people.doc-expiry", section: "people", group: "papers",
    label: { en: "Expiry list", ar: "قائمة انتهاء المستندات" },
    status: "live", archetype: "LF", roles: HR_GM, route: verify("expiry"),
    keywords: "P54 P40 expiry dated documents scans expiring" },
];
