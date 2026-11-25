import { EngineError, type Fils } from "@payroll/engine";

/** Plain decimal with two places, e.g. "2345.87". Never negative. */
export function formatAmount(f: Fils): string {
  if (f < 0n) {
    throw new EngineError("NEGATIVE_AMOUNT", "Amount cannot be negative", {
      value: f.toString(),
    });
  }
  const frac = (f % 100n).toString().padStart(2, "0");
  return `${f / 100n}.${frac}`;
}

export function padId(id: string, len: number): string {
  if (id.length > len) {
    throw new EngineError("ID_TOO_LONG", "Id is longer than the layout", {
      value: id,
      length: String(len),
    });
  }
  return id.padStart(len, "0");
}

/** Salary month as MMYYYY. */
export function formatMonth(y: number, m: number): string {
  return `${String(m).padStart(2, "0")}${String(y).padStart(4, "0")}`;
}

export function isoDate(y: number, m: number, d: number): string {
  const p = (n: number, w: number): string => String(n).padStart(w, "0");
  return `${p(y, 4)}-${p(m, 2)}-${p(d, 2)}`;
}

export function isAscii(s: string): boolean {
  return /^[\x00-\x7f]*$/.test(s);
}
