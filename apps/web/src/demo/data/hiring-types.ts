import type {
  BudgetAskSeed,
  BudgetStatus,
  BudgetTotals,
  HiringRequestView,
  InterviewStage,
  Milestone,
  MilestoneKey,
  MilestoneState,
  PositionBudget,
  PositionCost,
  RequestDraft,
  RequestEvent,
  RequestStatus,
  SpendLine,
  TimelineProgress,
  Urgency,
} from "@payroll/demo-data";
import type { Fils } from "@payroll/engine";
import type { Explanation } from "../../components/explain/types";

/**
 * Hiring budget and hiring requests as the screens read them. Built in
 * hiring.ts, which only adapter.ts imports. The shapes are the
 * package's own, re-exported so screens never import the package.
 */
export type {
  BudgetAskSeed,
  BudgetStatus,
  BudgetTotals,
  HiringRequestView,
  InterviewStage,
  Milestone,
  MilestoneKey,
  MilestoneState,
  PositionBudget,
  PositionCost,
  RequestDraft,
  RequestEvent,
  RequestStatus,
  SpendLine,
  TimelineProgress,
  Urgency,
};

export interface HiringRole { jobKey: string; title: string;
  departmentIds: string[]; gradeMin: number; gradeMax: number }

export interface HiringData {
  budget(): PositionBudget[];
  budgetAsks(): BudgetAskSeed[];
  totals(rows: readonly Pick<PositionBudget, "cost" | "committed" |
    "offered">[]): BudgetTotals;
  /** Seeded requests, oldest first. */
  requests(): HiringRequestView[];
  roles(): HiringRole[];
  departments(): { id: string; text: string }[];
  cost(grade: number, steps: number, startIso: string): PositionCost;
  band(grade: number): { min: Fils; max: Fils };
  jobDescription(jobKey: string, departmentId: string): string;
  criteria(jobKey: string): { mustHave: string[]; niceToHave: string[] };
  stages(hiringManagerId: string): InterviewStage[];
  hiringManagerFor(departmentId: string): string;
  check(d: RequestDraft): string[];
  tooSoon(startIso: string, ttf: number): boolean;
  timeline(p: { signedOffIso: string | null; timeToFillDays: number;
    startIso: string; progress: TimelineProgress }): Milestone[];
  progress(p: { published: boolean; stages: readonly string[];
    offers: readonly string[]; filled: boolean }): TimelineProgress;
  daysLeft(signedOffIso: string | null, ttf: number): number | null;
  statusOf(p: { requisition: "open" | "on-hold" | "filled" | null;
    stages: readonly string[]; taken: boolean }): BudgetStatus;
  number(n: number): string;
  stepText(grade: number, steps: number): string;
  jobTitle(jobKey: string): string;
  departmentText(id: string): string;
  /** "27 Oct 2026". */
  dateText(iso: string): string;
  addDays(iso: string, n: number): string;
  /** The workings behind a position's figures (explain panel). */
  explain: {
    /** `key`: the position's id, so two seats never share a working. */
    monthly(key: string, title: string, cost: PositionCost): Explanation;
    firstYear(key: string, title: string, cost: PositionCost): Explanation;
    left(key: string, title: string, p: { firstYear: Fils;
      committed: SpendLine | null; offered: SpendLine | null }): Explanation;
    total(label: string, rows: readonly { title: string;
      value: Fils }[]): Explanation;
  };
  budgetBasis: string;
  requestBasis: string;
  statusText: Readonly<Record<RequestStatus, string>>;
  budgetStatusText: Readonly<Record<BudgetStatus, string>>;
  urgencyText: Readonly<Record<Urgency, string>>;
  maxSteps: number;
  lastStart: string;
  asOf: string;
}
