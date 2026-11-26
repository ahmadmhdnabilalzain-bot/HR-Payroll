/** Shared by the WPD tests: serialise selector output and scan it. */
export const asText = (x: unknown): string => JSON.stringify(x,
  (_k, v: unknown) => typeof v === "bigint" ? String(v) : v);

/** Authority wording: signed off, booked, declined; never these. */
export const BANNED_WORDS =
  /\b(approved|approves?|approval|certified|certification|certifies)\b/i;

export const SEEDS = [1, 2026, 7777];
