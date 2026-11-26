import type { DemoData } from "../../demo/data/types";
import type {
  CandidateStage,
  HiringCandidate,
  HiringOffer,
  HiringRequisition,
  MoveChecklistItem,
  OfferStatus,
} from "../../demo/data/moves-types";
import type { MoveStep } from "../../demo/moves-state";
import { useDemo, type DemoState } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import { dayText } from "../words";

/** The person acting (the role's own), with the demo's date. */
export function useActor() {
  const { data, state } = useDemo();
  const id = personFor(data, state.role);
  const p = data.people.person(id);
  return { id, role: state.role, name: p?.name.en ?? "",
    title: p?.role.en ?? "", on: data.moves.asOf };
}

/** "Khalid Al Nuaimi, General manager, 27 October". */
export function whoText(name: string, title: string, on: string): string {
  return `${name}, ${title}, ${dayText(on, "en")}`;
}

/** Who took a step in the demo, in words. */
export function stepWho(d: DemoData, step: MoveStep): string {
  const p = d.people.person(step.by);
  return whoText(p?.name.en ?? "", p?.role.en ?? "", step.on);
}

export const checkKey = (list: string, item: string): string =>
  `check:${list}:${item}`;

export type ItemState = "done" | "open" | "overdue";

export interface ItemNow {
  item: MoveChecklistItem;
  state: ItemState;
  /** Done during the demo: who, and the way back. */
  step: MoveStep | null;
}

export function itemsNow(list: string, items: MoveChecklistItem[],
  s: Pick<DemoState, "steps">): ItemNow[] {
  return items.map((item) => {
    const step = s.steps[checkKey(list, item.key)] ?? null;
    return { item, step, state: step !== null ? "done" : item.state };
  });
}

export function progressOf(rows: ItemNow[]): { done: number; of: number } {
  return { done: rows.filter((x) => x.state === "done").length,
    of: rows.length };
}

export const STAGE_ORDER: CandidateStage[] = ["applied", "screening",
  "interview", "offer", "hired"];

export const STAGE_WORD: Record<CandidateStage, string> = {
  applied: "Applied", screening: "Screening", interview: "Interview",
  offer: "Offer", hired: "Hired", rejected: "Not taken forward",
  withdrawn: "Withdrew" };

/** The stage now: a step taken in the demo wins over the data. */
export function stageNow(c: HiringCandidate, s: Pick<DemoState, "steps">)
  : CandidateStage {
  const v = s.steps[`stage:${c.id}`]?.value;
  return v === undefined ? c.stage : v as CandidateStage;
}

/** The next stage a person can be moved to by hand, if any. */
export function nextStage(stage: CandidateStage): CandidateStage | null {
  const i = STAGE_ORDER.indexOf(stage);
  // Offer and Hired follow from the offer itself, not a button here.
  return i >= 0 && i < STAGE_ORDER.indexOf("offer") ? STAGE_ORDER[i + 1]
    ?? null : null;
}

export type OfferNow = OfferStatus | "waiting";

export const OFFER_WORD: Record<OfferNow, string> = {
  draft: "Draft", waiting: "Waiting for sign-off",
  sent: "Sent, waiting for an answer", accepted: "Accepted",
  declined: "Declined" };

/** One or two words, for a summary figure. */
export const OFFER_SHORT: Record<OfferNow, string> = { draft: "Draft",
  waiting: "Waiting", sent: "With candidate", accepted: "Accepted",
  declined: "Declined" };

export function offerNow(o: HiringOffer, s: Pick<DemoState, "steps">)
  : OfferNow {
  const v = s.steps[`offer:${o.id}`]?.value;
  return v === undefined ? o.status : v as OfferNow;
}

export type ReqNow = HiringRequisition["status"];

export const REQ_WORD: Record<ReqNow, string> = { open: "Open",
  "on-hold": "On hold", filled: "Filled" };

export function reqNow(r: HiringRequisition, s: Pick<DemoState, "steps">)
  : ReqNow {
  const v = s.steps[`req:${r.id}`]?.value;
  return v === undefined ? r.status : v as ReqNow;
}

export type Tone = "neutral" | "ok" | "warn" | "info";
