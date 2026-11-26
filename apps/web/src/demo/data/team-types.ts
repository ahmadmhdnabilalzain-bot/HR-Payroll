import type {
  AppraisalCycleView,
  AppraisalView,
  CostCentreView,
  DepartmentPerformance,
  DepartmentSeats,
  GoalView,
  OrgChartNode,
  OrgPerson,
  PeopleOverview,
  ProbationEvaluationView,
  SiteStaff,
  StaffPosition,
} from "@payroll/demo-data";

/**
 * Team and growth (WP2): the org chart, seats, sites, cost centres,
 * appraisals, goals and probation evaluations, as the screens read
 * them. Built in team.ts, which only adapter.ts imports. The shapes
 * are the package's own (display strings for dates, money values for
 * amounts), re-exported here so screens never import the package.
 */
export type {
  AppraisalCycleView,
  AppraisalView,
  CostCentreView,
  DepartmentPerformance,
  DepartmentSeats,
  GoalView,
  OrgChartNode,
  OrgPerson,
  PeopleOverview,
  ProbationEvaluationView,
  SiteStaff,
  StaffPosition,
};

export interface TeamData {
  overview(): PeopleOverview;
  chart(): OrgChartNode;
  reportingLine(employeeId: string): OrgPerson[];
  directReports(employeeId: string): OrgPerson[];
  positions(): StaffPosition[];
  seats(): DepartmentSeats[];
  sites(): SiteStaff[];
  costCentres(): CostCentreView[];
  cycles(): AppraisalCycleView[];
  appraisals(cycleId?: string): AppraisalView[];
  goals(): GoalView[];
  performance(): DepartmentPerformance[];
  probation(): ProbationEvaluationView[];
}
