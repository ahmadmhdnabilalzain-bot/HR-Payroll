/**
 * iCalendar text helpers (RFC 5545). Plan 11 owns this file when it is
 * merged; Plan 13 created it with only these two.
 */

/** Escapes backslash, semicolon, comma and newlines in a TEXT value. */
export function escapeIcsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Folds a content line at 75 octets (UTF-8): continuation lines start
 * with one space. Multi-byte characters are never split.
 */
export function foldIcsLine(line: string): string {
  const out: string[] = [];
  let cur = "";
  let size = 0;
  for (const ch of line) {
    const n = Buffer.byteLength(ch, "utf8");
    const limit = out.length === 0 ? 75 : 74;
    if (size + n > limit) {
      out.push(cur);
      cur = "";
      size = 0;
    }
    cur += ch;
    size += n;
  }
  out.push(cur);
  return out.join("\r\n ");
}
