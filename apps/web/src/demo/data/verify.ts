import {
  AS_OF,
  INTAKE_NOTE,
  intakeSamples,
  lookupLetter,
  VERIFY_NOTE,
  verifiableLetter,
  verifiableLetters,
  type DemoCompany,
} from "@payroll/demo-data";
import type { VerifyData } from "./verify-types";

/** The WP27 view over the demo company. Imported only by adapter.ts. */
export function adaptVerify(c: DemoCompany): VerifyData {
  return {
    asOf: AS_OF,
    letters: () => verifiableLetters(c),
    make: (x) => verifiableLetter(c, x),
    lookup: lookupLetter,
    samples: () => intakeSamples(c),
    note: VERIFY_NOTE,
    intakeNote: INTAKE_NOTE,
  };
}
