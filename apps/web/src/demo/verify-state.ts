import type { Role } from "./state";

/**
 * WP27: what is done on the verifiable-letter and document-intake
 * screens during the demo: a letter code withdrawn (P34) and a scanned
 * document taken in and tagged (P54). One slice in the demo store, like
 * papers-state.ts: every entry names who, their role and the demo's
 * date, and has an undo. The bytes of a scan are never kept here: they
 * stay in people/files/blobs.ts, in this tab's memory.
 */
export interface Who { by: string; role: Role; on: string }

export interface Intake extends Who {
  id: string;
  employeeId: string;
  docType: string;
  /** ISO expiry date, or null when the paper does not expire. */
  expires: string | null;
  fileName: string;
  bytes: number;
  /** The version it took in People, Documents. */
  version: number;
}

export interface VerifySlice {
  /** Letter id to who withdrew its code. */
  codesWithdrawn: Record<string, Who>;
  intakes: Intake[];
  /** Counter for ids: made in the reducer, so StrictMode stays sound. */
  nextIntake: number;
}

export type VerifyAction =
  | { type: "verify-withdraw"; id: string; who: Who }
  | { type: "verify-restore"; id: string }
  | { type: "verify-intake"; draft: Omit<Intake, "id"> }
  | { type: "verify-unintake"; id: string };

export const VERIFY_INITIAL: VerifySlice = { codesWithdrawn: {},
  intakes: [], nextIntake: 1 };

export function reduceVerify<S extends VerifySlice>(s: S, a: VerifyAction)
  : S {
  switch (a.type) {
    case "verify-withdraw": return { ...s,
      codesWithdrawn: { ...s.codesWithdrawn, [a.id]: a.who } };
    case "verify-restore": {
      const { [a.id]: _gone, ...rest } = s.codesWithdrawn;
      return { ...s, codesWithdrawn: rest };
    }
    case "verify-intake": return { ...s, nextIntake: s.nextIntake + 1,
      intakes: [{ ...a.draft, id: `in-new-${s.nextIntake}` },
        ...s.intakes] };
    case "verify-unintake": return { ...s,
      intakes: s.intakes.filter((x) => x.id !== a.id) };
  }
}
