import {
  COMP_OFF_NOTE,
  GRANT_NOTE,
  INCIDENT_REPORT_NOTE,
  INCIDENT_SEVERITY,
  checkGrant,
  checkIncidentReport,
  compOffBalances,
  compOffRows,
  grantPeople,
  grantRows,
  incidentFromReport,
  incidentPlaces,
  incidentsByMonthWith,
  type DemoCompany,
} from "@payroll/demo-data";
import type { FinishData } from "./finish-types";

/** The finish screens' view of the company. Imported only by adapter.ts. */
export function adaptFinish(c: DemoCompany): FinishData {
  return {
    compOff: () => compOffRows(c),
    balances: () => compOffBalances(c),
    compOffNote: COMP_OFF_NOTE,
    grants: () => grantRows(c),
    grantNote: GRANT_NOTE,
    grantPeople: () => grantPeople(c),
    checkGrant: (employeeId, days, reason) =>
      checkGrant(c, { employeeId, days, reason }),
    places: incidentPlaces,
    severities: INCIDENT_SEVERITY,
    reportNote: INCIDENT_REPORT_NOTE,
    checkReport: checkIncidentReport,
    reportView: (id, who, on, i) => incidentFromReport(c, id, who, on, i),
    byMonthWith: (closed, extra) => incidentsByMonthWith(c, closed, extra),
  };
}
