import type { Area, NavCtx } from "../types";

const HR_GM = ["hr", "gm"] as const;

/** Probation evaluations with no decision yet. */
const toDecide = (c: NavCtx): number => c.data.team.probation().filter((x) =>
  x.status === "in-progress" &&
  c.state.probationRecords[x.id]?.verdict == null).length;

const area = (id: string, group: string, en: string, archetype:
  Area["archetype"], rest: string[], keywords: string,
  count?: (c: NavCtx) => number | null): Area => ({ id,
  section: "people", group, label: { en, ar: en }, status: "live",
  archetype, roles: HR_GM, route: { section: "people", rest },
  ...(count === undefined ? {} : { count }), keywords });

/**
 * WP2: People, Team and Growth (navigation map, sections 7 and 8).
 * Arabic labels repeat the English: Arabic stays hidden in the demo.
 */
export const AREAS: readonly Area[] = [
  area("people.overview", "team", "Overview", "RP",
    ["team", "overview"], "P01 dashboard headcount joiners leavers"),
  area("people.org", "team", "Org chart", "custom",
    ["team", "org"], "P05 org chart reporting line manager hierarchy"),
  area("people.positions", "team", "Positions", "LF",
    ["team", "positions"], "P06 seats vacancies establishment budget " +
    "headcount"),
  area("people.sites", "team", "Sites", "RP",
    ["team", "sites"], "P07 branches locations sites offices"),
  area("people.centres", "team", "Cost centres", "LF",
    ["team", "cost-centres"], "P08 multi-entity cost centre department"),
  area("people.appraisals", "growth", "Appraisals", "LF",
    ["growth", "appraisals"], "P60 review rating self assessment cycle"),
  area("people.goals", "growth", "Goals", "LF",
    ["growth", "goals"], "P61 objectives okr targets progress kpi"),
  area("people.performance", "growth", "Performance", "RP",
    ["growth", "performance"], "P62 ratings goals by department"),
  area("people.probation", "moves", "Probation", "FA",
    ["growth", "probation"], "P19 probation confirm evaluate new hire " +
    "decide by", toDecide),
];
