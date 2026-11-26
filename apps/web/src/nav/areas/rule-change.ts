// NEEDS NATIVE REVIEW: the Arabic label is authored by Claude.
import {
  RULE_CHANGE_ID,
  ruleChangeWaiting,
} from "../../setup/rule-change/state";
import type { Area } from "../types";

/** WP28: S09, a pending rule change and who it moves in the next run. */
export const AREAS: readonly Area[] = [
  { id: "setup.rule-change", section: "setup", group: "pay",
    label: { en: "Rule change preview", ar: "معاينة تغيير القاعدة" },
    status: "live", archetype: "RP", roles: ["hr", "gm"],
    route: { section: "setup", rest: ["rule-change"] },
    count: (c) => ruleChangeWaiting(c.state.ruleChangeSteps,
      RULE_CHANGE_ID, c.state.role),
    keywords: "S09 rule change preview pack update notice overtime " +
      "uplift hypothetical next run who changes impact" },
];
