import type {
  DisplayDate,
  EsignDoc,
  EsignKind,
  EsignLine,
  EsignMark,
  EsignPack,
  EsignProgress,
  EsignSigner,
  EsignWord,
  Joiner,
  SigningProfile,
  SignStyle,
} from "@payroll/demo-data";

/**
 * D5 electronic signing, as the screens read it. Built in esign.ts,
 * which only adapter.ts imports. Package shapes are re-exported as
 * types so screens never import the package.
 */
export type {
  DisplayDate,
  EsignDoc,
  EsignKind,
  EsignLine,
  EsignMark,
  EsignPack,
  EsignProgress,
  EsignSigner,
  EsignWord,
  Joiner,
  SigningProfile,
  SignStyle,
};

export interface EsignData {
  asOf: string;
  note: string;
  consent: string;
  kinds: readonly EsignKind[];
  kindTitle: Record<EsignKind, string>;
  /** The person the employee role stands for. */
  employeeId: string;
  /** Every paper as it stood on the demo day (built once). */
  docs(): EsignDoc[];
  packs(): EsignPack[];
  profiles(): SigningProfile[];
  /** A candidate whose offer is accepted in the demo, or null. */
  joinerOfOffer(offerId: string, on: string): Joiner | null;
  profile(j: Joiner): SigningProfile;
  pack(j: Joiner): { pack: EsignPack; docs: EsignDoc[] };
  progress(d: EsignDoc, marks: readonly EsignMark[]): EsignProgress;
  ref(docId: string, order: number): string;
  /** The text that is hashed (the version line, then the lines). */
  text(d: EsignDoc): string;
  date(iso: string): DisplayDate;
}
