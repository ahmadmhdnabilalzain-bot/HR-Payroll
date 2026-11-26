import type { DemoData } from "../../demo/data/types";
import type { DemoState } from "../../demo/state";
import { offerNow } from "../moves/view";
import { letterRows } from "../papers/model";
import { LETTER_KIND } from "../papers/words";

export type SignNow = "not-requested" | "waiting" | "signed" | "closed";

export interface SignRow {
  /** "letter:lt-2" or "offer:offer-002". */
  id: string;
  kind: "letter" | "offer";
  sourceId: string;
  title: string;
  /** Who the paper is about. */
  personName: string;
  signerName: string;
  signerRole: string;
  /** The signer's employee id, for letters (the General manager). */
  signerId: string | null;
  now: SignNow;
  /** Typed in the demo (letters and offers alike), if any. */
  typed: DemoState["signed"][string] | undefined;
  asked: DemoState["signAsks"][string] | undefined;
}

/** Letters and offers that carry a signature, as the demo stands. */
export function signRows(d: DemoData, s: DemoState): SignRow[] {
  const gm = d.people.person(d.people.personas().gmId);
  const letters = letterRows(d, s).map((l): SignRow => {
    const id = `letter:${l.id}`;
    const typed = s.signed[id];
    return { id, kind: "letter", sourceId: l.id,
      title: LETTER_KIND[l.kind],
      personName: d.people.person(l.employeeId)?.name.en ?? l.employeeId,
      signerName: gm?.name.en ?? "", signerRole: gm?.role.en ?? "",
      signerId: l.signerId, typed, asked: s.signAsks[id],
      now: l.status === "issued" ? "signed" : l.status === "pending"
        ? "waiting" : l.status === "draft" ? "not-requested" : "closed" };
  });
  const offers = d.moves.offers().map((o): SignRow => {
    const id = `offer:${o.id}`;
    const v = offerNow(o, s);
    return { id, kind: "offer", sourceId: o.id, title: "Offer letter",
      personName: o.candidateName, signerName: o.candidateName,
      signerRole: "Candidate", signerId: null, typed: s.signed[id],
      asked: undefined, now: v === "accepted" ? "signed" : v === "sent"
        ? "waiting" : v === "declined" ? "closed" : "not-requested" };
  });
  return [...letters, ...offers];
}

/** Requests that wait for a signature. */
export const waitingSigns = (d: DemoData, s: DemoState): number =>
  signRows(d, s).filter((r) => r.now === "waiting").length;
