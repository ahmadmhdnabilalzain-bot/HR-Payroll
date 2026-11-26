// NEEDS NATIVE REVIEW: the Arabic labels are authored by Claude.
import type { Area } from "../types";

/** H15: ask about a policy, with answers quoted from the policy text.
 * Every role sees it, the IT manager too (no amounts in a policy). */
export const AREAS: readonly Area[] = [
  { id: "me.policies", section: "me", group: "mine",
    label: { en: "Policy answers", ar: "إجابات السياسات" },
    status: "live", archetype: "LF", route: { section: "me",
      rest: ["policies"] },
    keywords: "H15 policy policies ask question leave overtime expenses " +
      "probation notice end of service conduct dress hiring acknowledge" },
];
