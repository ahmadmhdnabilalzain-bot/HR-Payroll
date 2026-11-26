import { ibanChecksumOk } from "@payroll/wps";

/**
 * Identifiers that look like the real formats but can never be real.
 *
 * - IBAN: "AE00" or "AE01" + 3 bank digits + 16 digits. Issued IBANs
 *   carry check digits 02 to 98 (ISO 13616), so 00 and 01 are a
 *   documented fake range; 01 is used whenever 00 would happen to
 *   pass mod 97, so every demo IBAN also FAILS the mod 97 check. The
 *   contract (AE + 21 digits) still accepts them.
 * - Emirates ID: 784 + year + 7 digits + a check digit chosen so the
 *   Luhn check FAILS (a real card's digit passes it).
 * - Labour person id: 14 digits starting "99" (fake range).
 */
export interface FakeIdentifier {
  value: string;
  masked: string;
  fake: true;
  note: string;
}

export const FAKE_IBAN_NOTE =
  "Fake: check digits 00 or 01 (never issued) and fails mod 97";
export const FAKE_EID_NOTE = "Fake: check digit fails the Luhn check";
export const FAKE_PERSON_NOTE = "Fake: labour id in the demo 99 range";

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

export function fakeIban(bankDigits: string, n: number): FakeIdentifier {
  const tail = `${bankDigits}${String(n).padStart(16, "0")}`;
  const first = `AE00${tail}`;
  // 00 and 97 are equivalent under mod 97; 01 then always fails.
  const value = ibanChecksumOk(first) ? `AE01${tail}` : first;
  if (ibanChecksumOk(value)) throw new Error("fake IBAN passed mod 97");
  return { value, masked: `AE** **** **** **** ***${value.slice(-4)}`,
    fake: true, note: FAKE_IBAN_NOTE };
}

export function fakePersonId(n: number): string {
  return `99${String(n).padStart(12, "0")}`;
}

/** Employer id for the SIF: 13 digits in the same fake 99 range. */
export const FAKE_EMPLOYER_ID = "9900000000048";
