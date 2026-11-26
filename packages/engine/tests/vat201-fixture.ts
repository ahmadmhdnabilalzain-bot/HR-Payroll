import {
  fils,
  type Vat201Doc,
  type Vat201Input,
} from "../src/index";

let seq = 0;

/** A document with defaults: a DU standard sale tax invoice. */
export function doc(over: Partial<Omit<Vat201Doc, "net" | "vat" |
  "claimedVat">> & { net?: bigint; vat?: bigint;
  claimedVat?: bigint | null } = {}): Vat201Doc {
  seq += 1;
  const { net, vat, claimedVat, ...rest } = over;
  return {
    id: `d${seq}`,
    direction: "sale",
    kind: "tax-invoice",
    treatment: "standard",
    emirate: "DU",
    correctsPeriodStart: null,
    ...rest,
    net: fils(net ?? 0n),
    vat: fils(vat ?? 0n),
    claimedVat: claimedVat === undefined || claimedVat === null
      ? null : fils(claimedVat),
  };
}

export function purchase(net: bigint, vat: bigint,
  claimedVat: bigint | null,
  over: Partial<Vat201Doc> = {}): Vat201Doc {
  return doc({ direction: "purchase", emirate: null, net, vat,
    claimedVat, ...over });
}

export function input(documents: Vat201Doc[],
  over: Partial<Vat201Input> = {}): Vat201Input {
  return {
    periodStart: "2026-04-01",
    periodEnd: "2026-06-30",
    documents,
    box2: { kind: "none" },
    box6: { kind: "none" },
    box7: { kind: "none" },
    adjustments: {},
    refundRequested: false,
    ...over,
  };
}
