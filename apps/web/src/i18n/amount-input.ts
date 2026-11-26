import { fils, type Fils } from "@payroll/engine";

/** U+0660..U+0669 (Arabic-Indic) and U+06F0..U+06F9 (Persian). */
const EASTERN_DIGIT = /[\u0660-\u0669\u06f0-\u06f9]/g;
/** U+066B, the Arabic decimal separator. */
const ARABIC_DECIMAL = /\u066b/g;
/** "," and U+066C, the Arabic thousands separator. */
const THOUSANDS = /[,\u066c]/g;

function asciiDigits(text: string): string {
  return text.replace(EASTERN_DIGIT, (c) => {
    const code = c.charCodeAt(0);
    return String(code - (code >= 0x06f0 ? 0x06f0 : 0x0660));
  });
}

const SHAPE = /^(\d{1,9})(?:\.(\d{1,2}))?$/;

/**
 * An amount typed by a person, in AED. Accepts Arabic-Indic digits,
 * the Arabic decimal separator and thousands separators. Refuses
 * signs, exponents, three decimals and more than nine whole digits.
 * Integer arithmetic only.
 */
export function parseAmountInput(text: string): Fils {
  const normal = asciiDigits(text.trim())
    .replace(ARABIC_DECIMAL, ".")
    .replace(THOUSANDS, "");
  const m = SHAPE.exec(normal);
  if (m === null) {
    throw new Error(`INVALID_AMOUNT: not an AED amount: "${text}"`);
  }
  const frac = (m[2] ?? "").padEnd(2, "0");
  return fils(BigInt(m[1] ?? "0") * 100n + BigInt(frac));
}
