import { hrefOf } from "../../demo/route";

/**
 * Where an item on a dashboard opens. A seam: the item pages (one
 * page per problem, decision or document, with its description, the
 * fix and its history) come with `itemHref(type, id)` and <ItemLink>
 * from another package. Until they land, each kind opens the screen
 * where it is dealt with today: a problem before sign-off opens the
 * pay run's Fix step, a decision opens Home's Decisions, a person
 * their profile, a document the expiry report. Swap the body of this
 * function for `itemHref` when it lands; callers do not change.
 */
export type ItemType = "issue" | "approval" | "person" | "document" |
  "run" | "report";

export function itemHref(type: ItemType, id = ""): string {
  switch (type) {
    case "issue": return hrefOf("pay-run", "fix");
    case "approval": return hrefOf("home");
    case "person": return id === "" ? hrefOf("people")
      : hrefOf("people", id);
    case "document": return hrefOf("reports", "documents");
    case "run": return hrefOf("pay-run", id === "" ? "review" : id);
    case "report": return hrefOf("reports", ...(id === "" ? [] : [id]));
  }
}

/** A department's people: the People list on that department. */
export function deptPeopleHref(id: string): string {
  return hrefOf("people", "department", id);
}

/** The People list for a department named in a row ("Sales"), by the
 * departments' names; undefined when the words name none. */
export function deptHrefByName(depts: readonly { id: string;
  name: { en: string } }[], name: string): string | undefined {
  const d = depts.find((x) => x.name.en === name.trim());
  return d === undefined ? undefined : deptPeopleHref(d.id);
}

/** Words in a measure, item or point, and the page each opens. The
 * first match wins, so the specific words come first. */
const AREAS: readonly [RegExp, () => string][] = [
  // The brief's planned dates, each to the step it belongs to.
  [/^Dates: Sign off by/i, () => hrefOf("pay-run", "approve")],
  [/^Dates: Salary file sent/i, () => hrefOf("pay-run", "pay")],
  [/^Dates: Payday/i, () => hrefOf("pay-run", "pay")],
  [/^Dates: Cut-off/i, () => hrefOf("pay-run", "review")],
  [/^Dates: Final settlement/i, () => hrefOf("pay-run", "settlements")],
  [/settlement/i, () => hrefOf("pay-run", "settlements")],
  [/held|bank|stop pay|before sign-off|problems/i,
    () => itemHref("issue")],
  [/leave request|leave|absence|sick/i, () => hrefOf("reports", "leave")],
  [/decision|requests waiting|waiting for/i, () => itemHref("approval")],
  [/probation/i, () => hrefOf("people", "growth", "probation")],
  [/national/i, () => hrefOf("reports", "nationality")],
  [/document|papers|visa/i, () => itemHref("document")],
  [/access review/i, () => hrefOf("setup", "access", "review")],
  [/gratuity/i, () => hrefOf("reports", "gratuity-liability")],
  [/loan|advance/i, () => hrefOf("reports", "loans")],
  [/employer cost/i, () => hrefOf("reports", "employer-cost")],
  [/overtime/i, () => hrefOf("reports", "overtime")],
  [/cause|variance|change/i, () => hrefOf("reports", "variance")],
  [/department/i, () => hrefOf("reports", "departments")],
  [/payroll|active|headcount|joined|left|leaving|people paid|turnover/i,
    () => hrefOf("reports", "headcount")],
  [/pay run/i, () => itemHref("run")],
  [/net|gross|pay/i, () => hrefOf("reports", "summary")],
];

/** The page a line of a dashboard opens, from its own words. */
export function areaHref(words: string): string | undefined {
  return AREAS.find(([re]) => re.test(words))?.[1]();
}
