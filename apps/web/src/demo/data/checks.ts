import {
  anomalyChecks,
  AS_OF,
  hireCostPreview,
  hireRoles,
  REPORT_TEMPLATES,
  templateChoices,
  templateViewName,
  type DemoCompany,
} from "@payroll/demo-data";
import type { ChecksData } from "./checks-types";

/** The Checks view over the demo company. Imported only by adapter.ts. */
export function adaptChecks(c: DemoCompany): ChecksData {
  const seen = new Map<string, ReturnType<typeof anomalyChecks>>();
  return {
    anomalies: (bankSaved) => {
      const key = [...bankSaved].sort().join(",");
      const hit = seen.get(key);
      if (hit !== undefined) return hit;
      const made = anomalyChecks(c, { bankSaved });
      seen.set(key, made);
      return made;
    },
    hireRoles: () => hireRoles(c),
    hire: (e) => hireCostPreview(c, e),
    templates: REPORT_TEMPLATES,
    templateChoices: () => templateChoices(c),
    viewName: templateViewName,
    asOf: AS_OF,
  };
}
