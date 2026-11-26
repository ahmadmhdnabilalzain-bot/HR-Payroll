import type { Area, NavCtx } from "../types";

const HR_GM = ["hr", "gm"] as const;

/** Seats that are empty and being filled (an on-hold seat is not). */
const openSeats = (c: NavCtx): number =>
  c.data.team.positions().filter((x) => x.status === "vacant").length;

/** People in the open appraisal cycle who have not started. */
function notStarted(c: NavCtx): number {
  const cycle = c.data.team.cycles().find((x) => x.status === "open");
  return cycle === undefined ? 0 : c.data.team.appraisals(cycle.id)
    .filter((a) => a.status === "not-started").length;
}

const atRisk = (c: NavCtx): number => c.data.team.goals().filter((g) =>
  g.kind !== "probation" && g.status === "at-risk").length;

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
  area("people.overview", "team", "People overview", "RP",
    ["team", "overview"], "P01 dashboard headcount joiners leavers"),
  area("people.org", "team", "Organisation chart", "custom",
    ["team", "org"], "P05 org chart reporting line manager hierarchy"),
  area("people.positions", "team", "Positions and headcount", "LF",
    ["team", "positions"], "P06 seats vacancies establishment budget",
    openSeats),
  area("people.sites", "team", "Staff across the group", "RP",
    ["team", "sites"], "P07 branches locations sites offices"),
  area("people.centres", "team", "Cost centres", "LF",
    ["team", "cost-centres"], "P08 multi-entity cost centre department"),
  area("people.appraisals", "growth", "Appraisals and cycles", "LF",
    ["growth", "appraisals"], "P60 review rating self assessment cycle",
    notStarted),
  area("people.goals", "growth", "Goals and KPIs", "LF",
    ["growth", "goals"], "P61 objectives okr targets progress", atRisk),
  area("people.performance", "growth", "Department performance", "RP",
    ["growth", "performance"], "P62 ratings goals by department"),
  area("people.probation", "moves", "Probation evaluations", "FA",
    ["growth", "probation"], "P19 probation confirm evaluate new hire " +
    "decide by", toDecide),
];
