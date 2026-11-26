import type {
  ClaimRoute,
  CoverRow,
  NewHireInput,
  NewHireOptions,
  NewHirePlan,
  NewHireStart,
} from "@payroll/demo-data";

/**
 * The extra People, Time and Me screens (WP18), as they read the demo
 * company. Built in more.ts, which only adapter.ts imports. The shapes
 * are the package's own, re-exported so screens never import it.
 */
export type {
  ClaimRoute,
  CoverRow,
  NewHireInput,
  NewHireOptions,
  NewHirePlan,
  NewHireStart,
};

export interface MoreData {
  /** Accepted offers whose person is not yet on the staff list. */
  starts(): NewHireStart[];
  options(): NewHireOptions;
  checkHire(i: NewHireInput): string | null;
  plan(nationality: string): NewHirePlan;
  /** The next staff number, after `made` records already sent. */
  nextNumber(made: number): string;
  expenseKinds: readonly string[];
  claimRoute(employeeId: string, amount: bigint): ClaimRoute;
  claimLimitText: string;
  checkClaim(i: { kind: string; date: string; amount: bigint;
    note: string }): string | null;
  cover(): CoverRow[];
  coverPayRunNote: string;
  checkCover(approverId: string, coverId: string, from: string,
    to: string): string | null;
}
