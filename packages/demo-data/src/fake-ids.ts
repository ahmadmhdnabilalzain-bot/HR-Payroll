import { ibanChecksumOk } from "@payroll/wps";

/**
 * Identifiers that look like the real formats but can never be real.
 *
 * - IBAN: "AE" + check digits + bank digits 999 + 16 digits. The
 *   bank digits 999 are the demo's documented FAKE RANGE (the bank is
 *   fictional); the check digits are made valid so the SIF check only
 *   reports the problems the demo plants. One planted typo IBAN fails
 *   mod 97 on purpose.
 * - Emirates ID: 784 + year + 7 digits + a check digit chosen so the
 *   Luhn check FAILS (a real card's digit passes it); always masked.
 * - Labour person id and employer id: start with 99 (fake range).
 */
export interface FakeIdentifier {
  value: string;
  masked: string;
  fake: true;
  note: string;
}

export const FAKE_BANK_DIGITS = "999";
/** Routing code of the fictional bank: digits 2 to 4 match the IBAN. */
export const FAKE_ROUTING_CODE = "899900001";
export const FAKE_EMPLOYER_ID = "9900000000031";

export const FAKE_IBAN_NOTE = "Fake: bank digits 999 (fictional bank)";
export const FAKE_EID_NOTE = "Fake: check digit fails the Luhn check";

/** Luhn sum of a digit string is a multiple of 10. */
export function luhnOk(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

function luhnFailingDigit(body: string): string {
  for (let d = 0; d <= 9; d++) {
    if (!luhnOk(body + String(d))) return String(d);
  }
  return "0";
}

export function fakeEmiratesId(birthYear: number, n: number)
  : FakeIdentifier {
  const body = `784${birthYear}${String(n).padStart(7, "0")}`;
  const value = body + luhnFailingDigit(body);
  return { value, masked: "784-****-*******-*", fake: true,
    note: FAKE_EID_NOTE };
}

const mask = (v: string) => `AE** **** **** **** ***${v.slice(-4)}`;

/** A mod-97-valid IBAN in the fictional bank's 999 range. */
export function fakeIban(n: number): FakeIdentifier {
  const tail = `${FAKE_BANK_DIGITS}${String(n).padStart(16, "0")}`;
  for (let cd = 2; cd <= 98; cd++) {
    const value = `AE${String(cd).padStart(2, "0")}${tail}`;
    if (ibanChecksumOk(value)) {
      return { value, masked: mask(value), fake: true,
        note: FAKE_IBAN_NOTE };
    }
  }
  throw new Error("no check digits found");
}

/** The planted typo: the last two digits swapped, so mod 97 fails. */
export function typoIban(n: number): FakeIdentifier {
  const good = fakeIban(n).value;
  const value = good.slice(0, -2) + good.at(-1)! + good.at(-2)!;
  const final = ibanChecksumOk(value)
    ? good.slice(0, -1) + String((Number(good.at(-1)) + 1) % 10) : value;
  return { value: final, masked: mask(final), fake: true,
    note: `${FAKE_IBAN_NOTE}; planted typo, fails mod 97` };
}

export function fakePersonId(n: number): string {
  return `99${String(n).padStart(12, "0")}`;
}
