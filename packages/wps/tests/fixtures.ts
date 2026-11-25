/**
 * Clean SIF fixture: zero findings, warnings included. The IBANs are
 * dummy accounts with a correct mod 97 check and bank digits 024 that
 * match routing code 802420101.
 */
export const BASE: readonly string[] = [
  "EDR,00915012345663,802420101,AE400240043520123456701," +
    "2016-01-01,2016-01-31,31,4000.00,2500.00,0",
  "EVP,00915012345663,802420101,500.00,200.00,300.00,0.00,400.00," +
    "1100.00,0.00",
  "EDR,00915012345664,802420101,AE130240043520123456702," +
    "2016-01-01,2016-01-31,31,3000.00,0.00,0",
  "SCR,0000000123456,802420101,2016-01-26,1130,012016,2,9500.00," +
    "AED,abc company",
];

export const text = (lines: readonly string[]): string =>
  lines.join("\n") + "\n";

/** Replace field `field` (1-based) of line `line` (1-based). */
export function setField(
  line: number,
  field: number,
  value: string,
  lines: readonly string[] = BASE,
): string[] {
  return lines.map((l, i) => {
    if (i !== line - 1) return l;
    const parts = l.split(",");
    parts[field - 1] = value;
    return parts.join(",");
  });
}

/** DIB guide sample (S1), SCR count written as 01. */
export const DIB_SAMPLE = [
  "EDR,00915012345663,802420101,AE160240043520123456701,2016-01-01," +
    "2016-01-31,31,4000.00,2500.00,0",
  "EVP,00915012345663,802420101,500.00,200.00,300.00,0.00,400.00," +
    "1100.00,0.00",
  "SCR,0000000123456,802420101,2016-01-26,1130,012016,01,6500.00,AED," +
    "abc company",
].join("\r\n");

/**
 * Emirates Islamic guide sample (S2), RECONSTRUCTED: the guide text is
 * not in the repo, so this follows its described shape (DUMMYEMP ids,
 * a space after each comma, routing 703420114, bank digits 034).
 */
export const EI_SAMPLE = [
  "EDR, DUMMYEMP000001, 703420114, AE590340000000000000001, 2016-01-01," +
    " 2016-01-31, 31, 5000.00, 0.00, 0",
  "EDR, DUMMYEMP000002, 703420114, AE590340000000000000001, 2016-01-01," +
    " 2016-01-31, 31, 4000.00, 0.00, 0",
  "SCR, 0000000654321, 703420114, 2016-01-26, 1130, 012016, 2, 9000.00," +
    " AED, sample",
].join("\r\n");
