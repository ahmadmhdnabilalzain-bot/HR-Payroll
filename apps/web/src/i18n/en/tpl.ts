import type { EnNamespace } from "../types";

/** The screen templates' own words (ui/templates). */
export const tpl = {
  search: "Search",
  filter: "Filter",
  shown: "{n} of {total}",
  close: "Close",
  cancel: "Cancel",
  save: "Save",
  edit: "Edit",
  required: "{field} is needed.",
  makerChecker: "Prepared by {maker}. {checker} decides.",
  prevMonth: "Previous",
  nextMonth: "Next",
  who: "Who",
  csv: "Download CSV",
  print: "Print",
  changes: "Changes",
  explainHint: "Figures with a dotted line open how they are " +
    "worked out.",
  noChanges: "No changes yet.",
} satisfies EnNamespace;
