import { EngineError } from "../errors";
import { sub, type Fils } from "../money";
import { applyRuleChange, type RuleChange } from "../preview";
import type { ParamValue } from "../rules/types";
import type { Traced } from "../trace-types";
import { calculatePayslip, type PayrollPacks } from "./payslip";
import type { Payslip, PayslipInput } from "./types";

export interface PayslipPreview {
  hypothetical: true;
  before: Traced<Payslip>;
  after: Traced<Payslip>;
  grossDelta: Fils;
  netDelta: Fils;
}

/** The packs with the change applied to the list that holds its id. */
function changedPacks(packs: PayrollPacks, change: RuleChange):
  PayrollPacks {
  const holds = (list: PayrollPacks["payroll"]) =>
    list.some((p) => p.id === change.packId);
  if (holds(packs.payroll)) {
    return { ...packs, payroll: applyRuleChange(packs.payroll, change) };
  }
  if (holds(packs.gpssa)) {
    return { ...packs, gpssa: applyRuleChange(packs.gpssa, change) };
  }
  throw new EngineError("MISSING_PACK",
    `No payroll or GPSSA rule pack with id ${change.packId}`,
    { packId: change.packId });
}

/** One payslip before and after one hypothetical rule change. */
export function previewPayslipRuleChange(input: PayslipInput,
  packs: PayrollPacks, change: RuleChange,
  overrides?: Record<string, ParamValue>): PayslipPreview {
  const changed = changedPacks(packs, change);
  const before = calculatePayslip(input, packs, overrides);
  const after = calculatePayslip(input, changed, overrides);
  return {
    hypothetical: true,
    before,
    after,
    grossDelta: sub(after.value.gross, before.value.gross),
    netDelta: sub(after.value.net, before.value.net),
  };
}
