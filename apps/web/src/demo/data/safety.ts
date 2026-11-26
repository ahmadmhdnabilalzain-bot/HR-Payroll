import {
  AS_OF,
  ILOE_BASIS,
  ILOE_EXEMPT_NOTE,
  INSURANCE_BASIS,
  INSURER,
  insuranceCoverRows,
  iloeRows,
  incidents,
  incidentsByMonth,
  policies,
  type DemoCompany,
} from "@payroll/demo-data";
import type { SafetyData } from "./safety-types";

/** The Safety view over the demo company. Imported only by adapter.ts. */
export function adaptSafety(c: DemoCompany): SafetyData {
  return {
    cover: () => insuranceCoverRows(c),
    insurer: INSURER,
    insuranceBasis: INSURANCE_BASIS,
    incidents: () => incidents(c),
    byMonth: (closed) => incidentsByMonth(c, closed),
    iloe: () => iloeRows(c),
    iloeBasis: ILOE_BASIS,
    iloeExemptNote: ILOE_EXEMPT_NOTE,
    policies: () => policies(c),
    asOf: AS_OF,
  };
}
