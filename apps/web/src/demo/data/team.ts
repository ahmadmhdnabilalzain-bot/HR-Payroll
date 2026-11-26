import {
  appraisalCycleViews,
  appraisalViews,
  costCentreViews,
  departmentPerformance,
  directReportsOf,
  goalViews,
  orgChart,
  peopleOverview,
  positionViews,
  positionsByDepartment,
  probationEvaluationViews,
  reportingLineOf,
  staffAcrossSites,
  type DemoCompany,
} from "@payroll/demo-data";
import type { TeamData } from "./team-types";

/**
 * The Team and Growth view over the demo company. Imported only by
 * adapter.ts. Each method asks the package's selector when called (the
 * package caches the heavy part per company), so building this object
 * for every IBAN entered costs nothing.
 */
export function adaptTeam(c: DemoCompany): TeamData {
  return {
    overview: () => peopleOverview(c),
    chart: () => orgChart(c),
    reportingLine: (id) => reportingLineOf(c, id),
    directReports: (id) => directReportsOf(c, id),
    positions: () => positionViews(c),
    seats: () => positionsByDepartment(c),
    sites: () => staffAcrossSites(c),
    costCentres: () => costCentreViews(c),
    cycles: () => appraisalCycleViews(c),
    appraisals: (cycleId) => appraisalViews(c,
      cycleId === undefined ? {} : { cycleId }),
    goals: () => goalViews(c),
    performance: () => departmentPerformance(c),
    probation: () => probationEvaluationViews(c),
  };
}
