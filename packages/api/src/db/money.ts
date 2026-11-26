import { parseAed, type Fils } from "@payroll/engine";
import { CodedError } from "../coded-error";

export { parseAed };

/** Largest amount the wire format carries: 999,999,999.99 AED. */
const MAX_FILS = 99_999_999_999n;

/** Fils to the wire string "4000.00". The only way out of `Fils`. */
export function toMoney(f: Fils): string {
  if (f < 0n) {
    throw new CodedError("NEGATIVE_AMOUNT", "amount below zero");
  }
  if (f > MAX_FILS) {
    throw new CodedError("AMOUNT_TOO_LARGE", "amount above the wire cap");
  }
  const frac = (f % 100n).toString().padStart(2, "0");
  return `${f / 100n}.${frac}`;
}
