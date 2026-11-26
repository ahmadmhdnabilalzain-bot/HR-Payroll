import { fils } from "@payroll/engine";
import {
  CLAIM_LIMIT_TEXT,
  COVER_PAY_RUN_NOTE,
  EXPENSE_KINDS,
  checkClaim,
  checkCover,
  checkNewHire,
  claimRoute,
  coverRows,
  newHireOptions,
  newHirePlan,
  newHireStarts,
  nextEmployeeNumber,
  type DemoCompany,
} from "@payroll/demo-data";
import type { MoreData } from "./more-types";

/** The extra screens' view of the company. Imported only by adapter.ts. */
export function adaptMore(c: DemoCompany): MoreData {
  return {
    starts: () => newHireStarts(c),
    options: () => newHireOptions(c),
    checkHire: (i) => checkNewHire(c, i),
    plan: (n) => newHirePlan(c, n),
    nextNumber: (made) => nextEmployeeNumber(c, made),
    expenseKinds: EXPENSE_KINDS,
    claimRoute: (id, amount) => claimRoute(c, id, fils(amount)),
    claimLimitText: CLAIM_LIMIT_TEXT,
    checkClaim: (i) => checkClaim({ ...i, amount: fils(i.amount) }),
    cover: () => coverRows(c),
    coverPayRunNote: COVER_PAY_RUN_NOTE,
    checkCover: (a, cv, f, t) => checkCover(c, a, cv, f, t),
  };
}
