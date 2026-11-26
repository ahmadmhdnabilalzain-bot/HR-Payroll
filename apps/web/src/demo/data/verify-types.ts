import type {
  IntakeSample,
  Lookup,
  VerifiableKind,
  VerifiableLetter,
  VerifiableStatus,
} from "@payroll/demo-data";

/**
 * Verifiable letters and document intake (WP27), as the screens read
 * them. Built in verify.ts, which only adapter.ts imports. Package
 * shapes are re-exported as types so screens never import the package.
 */
export type {
  IntakeSample,
  Lookup,
  VerifiableKind,
  VerifiableLetter,
  VerifiableStatus,
};

export interface VerifyData {
  asOf: string;
  /** Letters that carry a code in the sample (issued before today). */
  letters(): VerifiableLetter[];
  /** One more record, for a letter issued or withdrawn in the demo. */
  make(x: { id: string; kind: VerifiableKind; employeeId: string;
    issuedOn: string; status: VerifiableStatus;
    withdrawnOn?: string | null }): VerifiableLetter;
  /** The check, worked out from the letters given. */
  lookup(all: readonly VerifiableLetter[], input: string): Lookup;
  /** Documents that came in before today. */
  samples(): IntakeSample[];
  note: string;
  intakeNote: string;
}
