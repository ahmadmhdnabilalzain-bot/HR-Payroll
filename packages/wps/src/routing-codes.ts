/**
 * Agent routing codes (SIF field 3), banks only.
 *
 * Source: the Emirates Islamic WPS guide (S2) routing code table, as
 * recorded in docs/research/2026-11-25-wps-sif-layout.md (2026-11-25).
 * Status: secondary. This table is PARTIAL: the research note lists six
 * banks, the full table is in the guide. It is also OLD (2016-era
 * guide) and some banks have merged since, so a current code can be
 * missing and a listed code can be retired. Codes are copied from the
 * note and never guessed. Before production, get the live list from
 * the bank or the central bank.
 *
 * `entityId` is the bank digits of an IBAN, which the research note
 * records as equal to routing code digits 2 to 4; it is taken from the
 * code, not looked up separately.
 */
export interface RoutingCode {
  readonly entityId: string;
  readonly name: string;
  readonly code: string;
}

const row = (name: string, code: string): RoutingCode => ({
  entityId: code.slice(1, 4),
  name,
  code,
});

export const ROUTING_CODES: readonly RoutingCode[] = [
  row("Dubai Islamic Bank", "802420101"),
  row("Emirates Islamic", "703420114"),
  row("Emirates NBD", "302620122"),
  row("Mashreq", "203320101"),
  row("Abu Dhabi Commercial Bank", "600310101"),
  row("RAK Bank", "604060101"),
];

/** Bank name for a routing code, or null when the table does not hold it. */
export function lookupRouting(code: string): string | null {
  return ROUTING_CODES.find((r) => r.code === code)?.name ?? null;
}
