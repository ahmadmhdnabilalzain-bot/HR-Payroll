import { deepFreeze } from "../freeze";

/**
 * Form VAT 201 layout of the FTA VAT Returns User Guide V4.0 (August
 * 2021), possibly outdated (Ruling 4). Labels are the research note's
 * short names of the guide's boxes (section 1.1), not quotes of the
 * form; Box 13's label is the FTA's wording, never the product's.
 */
export type Emirate = "AZ" | "DU" | "SH" | "AJ" | "UQ" | "RK" | "FU";

/** Product codes: Abu Dhabi, Dubai, Sharjah, Ajman, Umm Al Quwain,
 * Ras Al Khaimah, Fujairah (the guide's sub-box labels unconfirmed). */
export const EMIRATES: readonly Emirate[] =
  deepFreeze(["AZ", "DU", "SH", "AJ", "UQ", "RK", "FU"]);

export type BoxId =
  | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8"
  | "9" | "10" | "11" | "12" | "13" | "14" | "15";

export type BoxColumn = "amount" | "vat" | "adjustment";

export interface BoxDef {
  box: BoxId;
  section: "outputs" | "inputs" | "totals";
  guideLabel: string;
  columns: BoxColumn[];
  ftaPopulated: boolean;
  labelSource: "research-note" | "guide-pdf";
}

const FULL: BoxColumn[] = ["amount", "vat", "adjustment"];
const ENTERED: BoxColumn[] = ["amount", "vat"];

function b(box: BoxId, section: BoxDef["section"], guideLabel: string,
  columns: BoxColumn[], ftaPopulated = false): BoxDef {
  return { box, section, guideLabel, columns, ftaPopulated,
    labelSource: "research-note" };
}

export const VAT201_BOXES: readonly BoxDef[] = deepFreeze([
  b("1", "outputs", "Standard rated supplies", FULL),
  b("2", "outputs", "Tax refunds to tourists", ENTERED, true),
  b("3", "outputs", "Reverse charge supplies received", FULL),
  b("4", "outputs", "Zero-rated supplies", ["amount"]),
  b("5", "outputs", "Exempt supplies", ["amount"]),
  b("6", "outputs", "Goods imported into the UAE", ENTERED, true),
  b("7", "outputs", "Adjustments to goods imported", ENTERED, true),
  b("8", "outputs", "Totals (outputs)", FULL),
  b("9", "inputs", "Standard rated expenses", FULL),
  b("10", "inputs", "Reverse charge supplies (inputs)", FULL),
  b("11", "inputs", "Totals (inputs)", FULL),
  b("12", "totals", "Total value of due tax for the period", ["vat"]),
  b("13", "totals", "Total value of recoverable tax", ["vat"]),
  b("14", "totals", "Payable tax", ["vat"]),
  b("15", "totals", "Refund request", []),
]);
