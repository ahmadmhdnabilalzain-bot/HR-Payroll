import type { PayRunProblem } from "@payroll/contract";
import { ApiError } from "../http/errors";

/** 422 PAY_RUN_PROBLEMS: employee ids, codes and field names only. */
export function problemsError(ps: PayRunProblem[]): ApiError {
  return new ApiError("PAY_RUN_PROBLEMS", "The run cannot be computed yet",
    { problems: ps.map((p) => ({ employeeId: p.employeeId, code: p.code,
      missing: p.missing })) });
}
