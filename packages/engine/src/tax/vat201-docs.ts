import { isValidIsoDate } from "../dates";
import { EngineError } from "../errors";
import { fils, type Fils } from "../money";
import { EMIRATES } from "./vat201-layout";
import type {
  Vat201Correction,
  Vat201Doc,
  Vat201Problem,
  Vat201ProblemCode,
} from "./vat201-types";

/** Running sums of one document box ("1:DU", "3", "4", "9", ...). */
export interface Sum {
  amount: bigint;
  vat: bigint;
  count: number;
  vatUnknown: boolean;
}

export interface Placed {
  sums: Map<string, Sum>;
  problems: Vat201Problem[];
  excluded: string[];
}

function invalid(code: string, message: string, d: Vat201Doc,
  value: string): never {
  throw new EngineError(code, message, { docId: d.id, value });
}

function checkDoc(d: Vat201Doc, periodStart: string): void {
  const amounts = [d.net, d.vat, d.claimedVat ?? 0n];
  if (amounts.some((a) => a < 0n)) {
    invalid("INVALID_AMOUNT", "document amounts must be 0 or more; " +
      "credit notes are subtracted by the engine", d, amounts.join(","));
  }
  if (d.emirate !== null && !EMIRATES.includes(d.emirate)) {
    invalid("INVALID_EMIRATE", "unknown emirate code", d, d.emirate);
  }
  const c = d.correctsPeriodStart;
  if (c !== null && (!isValidIsoDate(c) || c >= periodStart)) {
    invalid("INVALID_PERIOD", "a correction must name an earlier " +
      "period start", d, c);
  }
}

/** Checks every document and that ids are unique. */
export function checkDocs(docs: readonly Vat201Doc[],
  periodStart: string): void {
  const seen = new Set<string>();
  for (const d of docs) {
    if (seen.has(d.id)) {
      invalid("DUPLICATE_DOCUMENT", "document ids must be unique", d,
        d.id);
    }
    seen.add(d.id);
    checkDoc(d, periodStart);
  }
}

class Placer {
  readonly sums = new Map<string, Sum>();
  readonly excluded: string[] = [];
  private readonly found = new Map<string, Vat201Problem>();

  problem(code: Vat201ProblemCode, box: string | null, id: string) {
    const key = `${code}|${box ?? ""}`;
    const p = this.found.get(key) ?? { code, docIds: [], box };
    p.docIds.push(id);
    this.found.set(key, p);
  }

  add(box: string, amount: bigint, vat: bigint | null): void {
    const s = this.sums.get(box) ??
      { amount: 0n, vat: 0n, count: 0, vatUnknown: false };
    s.amount += amount;
    s.count += 1;
    if (vat === null) s.vatUnknown = true;
    else s.vat += vat;
    this.sums.set(box, s);
  }

  problems(): Vat201Problem[] {
    return [...this.found.values()];
  }
}

const signOf = (d: Vat201Doc): bigint =>
  (d.kind === "credit-note" ? -1n : 1n);

function noVatOn(p: Placer, d: Vat201Doc, box: string | null): void {
  if (d.vat > 0n) p.problem("VAT_ON_NON_STANDARD", box, d.id);
}

function placeSale(p: Placer, d: Vat201Doc): void {
  const s = signOf(d);
  if (d.treatment === "standard") {
    if (d.emirate === null) p.problem("EMIRATE_REQUIRED", "1", d.id);
    else p.add(`1:${d.emirate}`, s * d.net, s * d.vat);
  } else if (d.treatment === "zero-rated" || d.treatment === "exempt") {
    const box = d.treatment === "zero-rated" ? "4" : "5";
    p.add(box, s * d.net, 0n);
    noVatOn(p, d, box);
  } else if (d.treatment === "out-of-scope") {
    p.excluded.push(d.id);
    noVatOn(p, d, null);
  } else {
    p.problem("TREATMENT_DIRECTION_INVALID", null, d.id);
  }
}

function placeInput(p: Placer, d: Vat201Doc, box: "9" | "10"): void {
  const s = signOf(d);
  if (d.claimedVat === null) {
    p.problem("INPUT_TAX_UNDECIDED", box, d.id);
    p.add(box, s * d.net, null);
    return;
  }
  if (d.claimedVat > d.vat) p.problem("CLAIMED_EXCEEDS_VAT", box, d.id);
  p.add(box, s * d.net, s * d.claimedVat);
}

function placePurchase(p: Placer, d: Vat201Doc): void {
  if (d.treatment === "standard") {
    placeInput(p, d, "9");
  } else if (d.treatment === "reverse-charge") {
    const s = signOf(d);
    p.add("3", s * d.net, s * d.vat);
    placeInput(p, d, "10");
  } else {
    p.excluded.push(d.id);
    noVatOn(p, d, null);
  }
}

/** Puts each document in its guide box, collecting problems. */
export function placeDocs(docs: readonly Vat201Doc[]): Placed {
  const p = new Placer();
  for (const d of docs) {
    if (d.direction === "sale") placeSale(p, d);
    else placePurchase(p, d);
  }
  return { sums: p.sums, problems: p.problems(), excluded: p.excluded };
}

/**
 * Net VAT effect per corrected period, as the plan states it: sale
 * VAT minus claimed purchase VAT, credit notes negative.
 */
export function corrections(docs: readonly Vat201Doc[],
  threshold: bigint): Vat201Correction[] {
  const effect = new Map<string, bigint>();
  for (const d of docs) {
    if (d.correctsPeriodStart === null) continue;
    const vat = d.direction === "sale" ? d.vat : -(d.claimedVat ?? 0n);
    const prev = effect.get(d.correctsPeriodStart) ?? 0n;
    effect.set(d.correctsPeriodStart, prev + signOf(d) * vat);
  }
  return [...effect.keys()].sort().map((periodStart) => {
    const net: Fils = fils(effect.get(periodStart)!);
    const size = net < 0n ? -net : net;
    return { periodStart, netVatEffect: net, overThreshold:
      size > threshold };
  });
}
