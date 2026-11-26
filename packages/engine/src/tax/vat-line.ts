import { EngineError } from "../errors";
import { fils, mulDiv, type Fils } from "../money";
import { selectPack } from "../rules/select";
import type { RulePack } from "../rules/types";
import { VAT_PACKS } from "../rules/vat-pack";
import type { Traced } from "../trace-types";
import { intParam, modeParam } from "./params";

/**
 * Company-tagged VAT categories (Ruling 3). Only the standard rate is
 * a rate; the product never decides which category a supply is in.
 */
export type VatTreatment =
  | "standard"
  | "zero-rated"
  | "exempt"
  | "out-of-scope"
  | "reverse-charge";

export interface VatFinding {
  code: "VAT_NOT_AT_STANDARD_RATE" | "VAT_ON_NON_STANDARD";
  severity: "warning" | "error";
  expected: Fils | null;
}

export interface VatDocumentAmounts {
  treatment: VatTreatment;
  net: Fils;
  vat: Fils;
}

/** VAT at the standard rate on a net amount, rounded per the pack. */
export function vatOnNet(
  net: Fils,
  onDate: string,
  packs: readonly RulePack[] = VAT_PACKS,
): Traced<Fils> {
  const pack = selectPack(packs, onDate);
  const rate = intParam(pack, "standardRateBps", undefined, 0);
  const mode = modeParam(pack, "vatRounding");
  const vat = mulDiv(net, rate.v, 10000n, mode.v);
  return {
    value: vat,
    trace: [{
      id: "vat.line",
      label: "VAT at the standard rate",
      formula: "net x standardRateBps / 10000, rounded by vatRounding",
      inputs: { net: net.toString(), onDate },
      result: vat.toString(),
      rules: [rate.rule, mode.rule],
    }],
  };
}

function checkNotNegative(doc: VatDocumentAmounts): void {
  const fields: [string, Fils][] = [["net", doc.net], ["vat", doc.vat]];
  for (const [field, value] of fields) {
    if (value < 0n) {
      throw new EngineError("INVALID_AMOUNT",
        `${field} must be 0 or more (credit notes pass positive values)`,
        { field, value: value.toString() });
    }
  }
}

const abs = (x: bigint): bigint => (x < 0n ? -x : x);

/**
 * Checks the VAT entered on one document against its category: a
 * warning when standard or reverse-charge VAT is off the standard
 * rate by more than the tolerance, an error when a zero-rated,
 * exempt or out-of-scope document carries VAT.
 */
export function checkDocumentVat(
  doc: VatDocumentAmounts,
  onDate: string,
  packs: readonly RulePack[] = VAT_PACKS,
): VatFinding[] {
  checkNotNegative(doc);
  if (doc.treatment !== "standard" && doc.treatment !== "reverse-charge") {
    return doc.vat > 0n ? [{ code: "VAT_ON_NON_STANDARD",
      severity: "error", expected: fils(0n) }] : [];
  }
  const pack = selectPack(packs, onDate);
  const tolerance = intParam(pack, "vatMismatchToleranceFils",
    undefined, 0).v;
  const expected = vatOnNet(doc.net, onDate, packs).value;
  if (abs(doc.vat - expected) <= tolerance) return [];
  return [{ code: "VAT_NOT_AT_STANDARD_RATE", severity: "warning",
    expected }];
}
