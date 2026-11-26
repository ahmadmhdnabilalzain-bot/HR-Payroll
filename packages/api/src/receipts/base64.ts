/** The standard alphabet (no spaces, no URL-safe set). */
const CHARS = /^[A-Za-z0-9+/]*$/;

const padOf = (s: string) => s.endsWith("==") ? 2 : s.endsWith("=") ? 1 : 0;

/**
 * Is `s` standard base64 with padding? Checked before decoding. A
 * plain character class, not a repeated group: a grouped pattern
 * overflows the regex stack on a 7 MB string.
 */
export function isStrictBase64(s: string): boolean {
  if (s.length === 0 || s.length % 4 !== 0) return false;
  return CHARS.test(s.slice(0, s.length - padOf(s)));
}

/** The decoded byte count of strict base64, without decoding it. */
export function decodedLength(s: string): number {
  return (s.length / 4) * 3 - padOf(s);
}

/**
 * Decodes strict base64; null when the text is not canonical (Node's
 * decoder never throws and silently skips bad characters, so the
 * result is re-encoded and compared).
 */
export function decodeStrict(s: string): Uint8Array | null {
  if (!isStrictBase64(s)) return null;
  const b = Buffer.from(s, "base64");
  return b.toString("base64") === s ? new Uint8Array(b) : null;
}

export function encodeBase64(b: Uint8Array): string {
  return Buffer.from(b).toString("base64");
}
