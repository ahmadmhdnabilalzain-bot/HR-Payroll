import { FEED_TOKEN_RE } from "@payroll/contract";

const hex = (id: string) => id.replace(/-/g, "");
const dashed = (h: string) => `${h.slice(0, 8)}-${h.slice(8, 12)}-` +
  `${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;

/** Pure: `cal1.<company hex>.<feed hex>.<secret base64url>.ics`. */
export function formatFeedToken(companyId: string, feedId: string,
  secret: Uint8Array): string {
  return `cal1.${hex(companyId)}.${hex(feedId)}.` +
    `${Buffer.from(secret).toString("base64url")}.ics`;
}

/** Pure: the ids (dashes restored) and the secret text, or null. */
export function parseFeedToken(t: string)
  : { companyId: string; feedId: string; secret: string } | null {
  const m = FEED_TOKEN_RE.exec(t);
  if (m === null) return null;
  return { companyId: dashed(m[1]!), feedId: dashed(m[2]!), secret: m[3]! };
}
