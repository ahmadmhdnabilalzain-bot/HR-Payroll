const IBAN = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;

/**
 * ISO 13616 mod 97 check: move the first four characters to the end,
 * replace letters with numbers (A=10 .. Z=35) and require the remainder
 * 1. Uppercase only; anything malformed is false.
 */
export function ibanChecksumOk(iban: string): boolean {
  if (!IBAN.test(iban)) return false;
  const moved = iban.slice(4) + iban.slice(0, 4);
  let rem = 0;
  for (const ch of moved) {
    const code = ch.charCodeAt(0);
    const n = code >= 65 ? code - 55 : code - 48;
    rem = n >= 10 ? (rem * 100 + n) % 97 : (rem * 10 + n) % 97;
  }
  return rem === 1;
}
