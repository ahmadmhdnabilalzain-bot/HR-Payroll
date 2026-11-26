import type { TraceLine } from "@payroll/contract";
import {
  calculateProbation,
  EMPLOYMENT_PACKS,
  EngineError,
  validateContractNotice,
  type ProbationResult,
  type Traced,
} from "@payroll/engine";

export interface EngineTerms {
  probation: Traced<ProbationResult>;
  /** Probation lines, then the contract notice line. */
  trace: TraceLine[];
}

/**
 * No probation for a joiner the employment pack does not cover
 * (joined before 2022-02-02): with zero months there is nothing to
 * date, so the refusal is not an error; with months it still is.
 */
function probationFor(joiningDate: string,
  months: number): Traced<ProbationResult> {
  try {
    return calculateProbation({ joiningDate, probationMonths: months },
      EMPLOYMENT_PACKS);
  } catch (e) {
    const noPack = e instanceof EngineError && e.code === "NO_PACK_FOR_DATE";
    if (!noPack || months !== 0) throw e;
    return { value: { probationEndDate: null,
      employerNoticeDeadline: null }, trace: [] };
  }
}

/**
 * Probation dates and the contract notice check, both from the engine
 * (an EngineError reaches the client as 422 ENGINE_REFUSED). The
 * notice is checked against the pack in force on `noticeOnDate`.
 */
export function engineTerms(joiningDate: string, probationMonths: number,
  contractNoticeDays: number, noticeOnDate: string): EngineTerms {
  const probation = probationFor(joiningDate, probationMonths);
  const notice = validateContractNotice(contractNoticeDays, noticeOnDate,
    EMPLOYMENT_PACKS);
  return { probation, trace: [...probation.trace, ...notice.trace] };
}
