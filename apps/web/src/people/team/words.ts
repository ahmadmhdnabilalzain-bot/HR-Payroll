/**
 * The words of Team and Growth. English only: Arabic stays hidden in
 * the demo until a native speaker has read it, and these screens fall
 * back to English for it (the same way the data package's text does).
 */
export const W = {
  team: "Team",
  growth: "Growth",
  overview: { title: "People overview", asOf: "As of {date}",
    figure: "People working today", dept: "Departments",
    open: "Open seats", none: "No open seats",
    openOf: "{n} open", month: "This month",
    joined: "{name} joined", left: "{name} left",
    on: "On {date}", probation: "In probation",
    inProbation: "{name} is in probation",
    decideBy: "Decide by {date}", vacancies: "Open vacancies",
    seatsLine: "Seats waiting to be filled" },
  org: { title: "Organisation chart",
    lede: "Who reports to whom, from the General manager down.",
    find: "Find a person", findHint: "Name or job title",
    expandAll: "Expand all", collapseAll: "Collapse all",
    open: "Show {name}'s team", close: "Hide {name}'s team",
    people: "{n} in the team", one: "1 in the team",
    shown: "{n} of {total} people", none: "Nobody matches “{q}”.",
    clear: "Clear the search", tree: "Reporting lines",
    board: "Reports to the board" },
  positions: { title: "Positions and seats",
    lede: "Every seat in the plan: who sits in it, and what is open.",
    all: "All", filled: "Filled", vacant: "Vacant", hold: "On hold",
    seat: "Seat", dept: "Department", place: "Place", status: "Status",
    band: "Basic pay band", who: "Who", empty: "No seats match." },
  sites: { title: "Staff across sites",
    lede: "Where people work today, by department.",
    siteCount: "Sites", deptCount: "Departments" },
  centres: { title: "Cost centres",
    lede: "One cost centre for each department. Gross is this " +
      "month's pay run.",
    code: "Code", dept: "Department", slips: "Payslips",
    gross: "Gross this month", total: "All together",
    empty: "No cost centres." },
};

/** Fill {name} style holes. */
export function fill(text: string, vars: Record<string, string | number>)
  : string {
  return text.replace(/\{(\w+)\}/g, (all, k: string) =>
    vars[k] === undefined ? all : String(vars[k]));
}
