import { EngineError } from "./errors";

export type Fils = bigint & { readonly __brand: "Fils" };
export type RoundingMode = "HALF_UP" | "HALF_EVEN" | "DOWN" | "UP";

export function fils(value: bigint): Fils {
  return value as Fils;
}

const AED_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/;

export function parseAed(text: string): Fils {
  const m = AED_PATTERN.exec(text);
  if (m === null) {
    throw new EngineError("INVALID_AMOUNT", "Not a valid AED amount", {
      value: text,
    });
  }
  const frac = (m[2] ?? "").padEnd(2, "0");
  return fils(BigInt(m[1] ?? "0") * 100n + BigInt(frac));
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+$)/g, ",");
}

export function formatAed(amount: Fils): string {
  const neg = amount < 0n;
  const abs = neg ? -amount : amount;
  const whole = groupThousands((abs / 100n).toString());
  const frac = (abs % 100n).toString().padStart(2, "0");
  return `${neg ? "-" : ""}AED ${whole}.${frac}`;
}

export function add(a: Fils, b: Fils): Fils {
  return fils(a + b);
}

export function sub(a: Fils, b: Fils): Fils {
  return fils(a - b);
}

/** True when the magnitude quotient must grow by one. */
function bumpsUp(
  mode: RoundingMode,
  quotient: bigint,
  rem: bigint,
  den: bigint,
): boolean {
  if (rem === 0n || mode === "DOWN") return false;
  if (mode === "UP") return true;
  const twice = rem * 2n;
  if (twice !== den) return twice > den;
  return mode === "HALF_UP" || quotient % 2n === 1n;
}

export function mulDiv(
  amount: Fils,
  num: bigint,
  den: bigint,
  mode: RoundingMode,
): Fils {
  if (den <= 0n) {
    throw new EngineError("DIVIDE_BY_ZERO", "Denominator must be positive", {
      denominator: den.toString(),
    });
  }
  const product = amount * num;
  const neg = product < 0n;
  const abs = neg ? -product : product;
  const quotient = abs / den;
  const bump = bumpsUp(mode, quotient, abs % den, den);
  const magnitude = bump ? quotient + 1n : quotient;
  return fils(neg ? -magnitude : magnitude);
}
