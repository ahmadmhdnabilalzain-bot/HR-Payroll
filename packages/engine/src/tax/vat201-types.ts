import type { Fils } from "../money";
import type { VatTreatment } from "./vat-line";
import type { Emirate } from "./vat201-layout";

/** One ledger document; amounts 0 or more, credit notes subtract. */
export interface Vat201Doc {
  id: string;
  direction: "sale" | "purchase";
  kind: "tax-invoice" | "simplified-invoice" | "credit-note";
  treatment: VatTreatment;
  emirate: Emirate | null;
  net: Fils;
  vat: Fils;
  claimedVat: Fils | null;
  correctsPeriodStart: string | null;
}

/** Boxes 2, 6 and 7 are entered from EmaraTax, never computed. */
export type FtaBoxInput =
  | { kind: "not-entered" }
  | { kind: "none" }
  | { kind: "entered"; amount: Fils; vat: Fils };

export type AdjustmentKey = `1:${Emirate}` | "3" | "9" | "10";

export interface Vat201Input {
  periodStart: string;
  periodEnd: string;
  documents: Vat201Doc[];
  box2: FtaBoxInput;
  box6: FtaBoxInput;
  box7: FtaBoxInput;
  adjustments: Partial<Record<AdjustmentKey, Fils>>;
  refundRequested: boolean;
}

export interface BoxFigure {
  amount: Fils | null;
  vat: Fils | null;
  adjustment: Fils | null;
}

export type Vat201ProblemCode =
  | "EMIRATE_REQUIRED"
  | "INPUT_TAX_UNDECIDED"
  | "CLAIMED_EXCEEDS_VAT"
  | "VAT_ON_NON_STANDARD"
  | "TREATMENT_DIRECTION_INVALID"
  | "FTA_BOX_NOT_ENTERED";

export interface Vat201Problem {
  code: Vat201ProblemCode;
  docIds: string[];
  box: string | null;
}

export interface Vat201Warning {
  code: "LAYOUT_FROM_2021_GUIDE" | "NEGATIVE_BOX" |
    "REFUND_NOT_APPLICABLE" | "VOLUNTARY_DISCLOSURE_MAY_BE_NEEDED" |
    "NIL_RETURN";
  box: string | null;
  periodStart: string | null;
}

export type MiddleBox =
  "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11";

export interface Vat201Correction {
  periodStart: string;
  netVatEffect: Fils;
  overThreshold: boolean;
}

export interface Vat201 {
  status: "complete" | "incomplete";
  box1: Record<Emirate, BoxFigure>;
  boxes: Record<MiddleBox, BoxFigure>;
  box12: Fils | null;
  box13: Fils | null;
  box14: Fils | null;
  box15: boolean | null;
  corrections: Vat201Correction[];
  problems: Vat201Problem[];
  warnings: Vat201Warning[];
  excludedDocIds: string[];
  notComputed: string[];
}
