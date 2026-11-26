import { deepFreeze } from "../freeze";
import { OFF, sourced } from "./tax-param";
import type { RulePack } from "./types";

/** FTA Decision 17 of 2026, effective 1 Oct 2026 (Article 3). */
const AE_VAT_EMPLOYEE_EXPENSE: RulePack = {
  id: "ae-vat-employee-expense",
  version: "2026-10-01",
  effectiveFrom: "2026-10-01",
  effectiveTo: null,
  params: {
    // Article 2, case 4: "temporary for a period no longer than 30
    // days".
    newEmployeeAccommodationMaxDays:
      sourced(30, OFF, "FTA_DEC17_2026_ART2_4"),
  },
};

export const EMPLOYEE_EXPENSE_VAT_PACKS: readonly RulePack[] =
  deepFreeze([AE_VAT_EMPLOYEE_EXPENSE]);
