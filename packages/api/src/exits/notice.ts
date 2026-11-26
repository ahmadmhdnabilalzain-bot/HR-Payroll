import type { EmploymentTerms, ExitCreate } from "@payroll/contract";
import {
  calculateNotice,
  EMPLOYMENT_PACKS,
  type NoticeResult,
  type Traced,
} from "@payroll/engine";

/**
 * The exit's notice from the engine (`ae-employment`): probation end
 * and contract notice from the stored terms. An EngineError reaches
 * the client as 422 ENGINE_REFUSED with its code.
 */
export function noticeFor(employee: { joiningDate: string },
  terms: EmploymentTerms, body: ExitCreate): Traced<NoticeResult> {
  return calculateNotice({ kind: body.kind,
    joiningDate: employee.joiningDate,
    noticeGivenDate: body.noticeGivenDate,
    probationEndDate: terms.probationEndDate,
    contractNoticeDays: terms.contractNoticeDays,
    agreedNoticeDays: body.agreedNoticeDays ?? null }, EMPLOYMENT_PACKS);
}
