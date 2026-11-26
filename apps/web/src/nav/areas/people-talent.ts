// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
import type { Area, AreaRoute, NavCtx } from "../types";

const HR_GM = ["hr", "gm"] as const;
const talent = (...rest: string[]): AreaRoute =>
  ({ section: "people", rest: ["talent", ...rest] });

/** Records still to do and already past their due day. */
function overdue(c: NavCtx): number {
  const t = c.data.talent;
  return t.records().filter((r) => r.status === "to-do" &&
    r.dueOn !== null && r.dueOn.iso < t.asOf).length;
}

/** WP13: skills, training and engagement surveys (Growth). */
export const AREAS: readonly Area[] = [
  { id: "people.skills", section: "people", group: "growth",
    label: { en: "Skills", ar: "المهارات" },
    status: "live", archetype: "LF", roles: HR_GM, route: talent("skills"),
    keywords: "P63 skills levels gaps matrix competencies" },
  { id: "people.training", section: "people", group: "growth",
    label: { en: "Training and learning", ar: "التدريب والتعلّم" },
    status: "live", archetype: "LF", roles: ["hr", "gm", "manager"],
    route: talent("training"), count: overdue,
    keywords: "P64 training courses learning sessions completed induction" },
  { id: "people.surveys", section: "people", group: "growth",
    label: { en: "Engagement surveys", ar: "استبيانات المشاركة" },
    status: "live", archetype: "LF", roles: HR_GM, route: talent("surveys"),
    keywords: "P65 engagement pulse survey results score anonymous" },
];
