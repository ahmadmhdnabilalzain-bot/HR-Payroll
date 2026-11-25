import { deepFreeze } from "../freeze";
import type { Lang } from "./catalog";

/** Headers and labels the CLI prints around the explanation. */
export interface CliText {
  total: string;
  notComputed: string;
  hypothetical: string;
  before: string;
  after: string;
  delta: string;
  listSeparator: string;
  /** Words for the settlement's notComputed items, keyed by item. */
  items: Record<string, string>;
}

const EN: CliText = {
  total: "Computed total (excludes notice pay, deductions and other dues):",
  notComputed: "Not computed:",
  hypothetical: "HYPOTHETICAL (not law):",
  before: "Before:",
  after: "After:",
  delta: "Delta:",
  listSeparator: ", ",
  items: { "notice pay": "notice pay", deductions: "deductions",
    "other dues": "other dues" },
};

// NEEDS NATIVE REVIEW: Arabic labels authored by Claude.
const AR: CliText = {
  total: "المجموع المحسوب (لا يشمل بدل الإنذار والخصومات والمستحقات " +
    "الأخرى):",
  notComputed: "غير محسوب:",
  hypothetical: "افتراضي (ليس قانوناً):",
  before: "قبل:",
  after: "بعد:",
  delta: "الفرق:",
  listSeparator: "، ",
  items: { "notice pay": "بدل الإنذار", deductions: "الخصومات",
    "other dues": "المستحقات الأخرى" },
};

export const CLI_TEXT: Record<Lang, CliText> = deepFreeze({ en: EN, ar: AR });
