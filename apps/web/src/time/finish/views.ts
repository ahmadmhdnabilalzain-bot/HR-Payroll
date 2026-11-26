import type { IncidentView } from "../../demo/data/finish-types";
import type { DemoData } from "../../demo/data/types";
import type { DemoState } from "../../demo/state";

/** Reports employees made in this visit, as the HR log shows them. */
export function reportViews(data: DemoData, state: DemoState)
  : IncidentView[] {
  return state.incidentReports.filter((r) => !r.withdrawn).map((r) =>
    data.finish.reportView(r.id, r.reporterId, r.reportedOn, r));
}

/** The log: reports made in this visit first, then the seeded log. */
export function logRows(data: DemoData, state: DemoState): IncidentView[] {
  return [...reportViews(data, state), ...data.safety.incidents()];
}
