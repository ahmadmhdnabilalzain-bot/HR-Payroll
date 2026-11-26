import type {
  AccessStatus,
  ChangeStatus,
  TicketStatus,
  TravelStatus,
} from "./model";
import type { Tone } from "../papers/words";

/**
 * The requests screens' own words (English; Arabic stays hidden until a
 * native speaker has read it). A status says who did what and when and
 * makes no claim about a rule or an outside body.
 */
export type { Tone };
export { ROLE_WORD } from "../papers/words";

export const CHANGE_STATUS: Record<ChangeStatus, [string, Tone]> = {
  open: ["Waiting", "warn"], proof: ["Proof asked", "info"],
  done: ["Record updated", "ok"], declined: ["Declined", "quiet"],
};

export const TRAVEL_STATUS: Record<TravelStatus, [string, Tone]> = {
  open: ["To book", "warn"], booked: ["Booked", "info"],
  done: ["Travelled", "ok"], declined: ["Declined", "quiet"],
};

export const TICKET_STATUS: Record<TicketStatus, [string, Tone]> = {
  open: ["Needs a reply", "warn"], waiting: ["Waiting for the person",
    "info"], solved: ["Solved", "ok"],
};

export const ACCESS_STATUS: Record<AccessStatus, [string, Tone]> = {
  open: ["Waiting", "warn"], granted: ["Given", "ok"],
  declined: ["Declined", "quiet"],
};

/** What a step is called in a history line ("Declined by ..."). */
export const VERB: Record<string, string> = { done: "Record updated",
  proof: "Proof asked", declined: "Declined", booked: "Booked",
  granted: "Given", solved: "Marked solved", open: "Reopened" };

/** "Today", "1 day", "3 days". */
export function waitText(days: number): string {
  if (days <= 0) return "Today";
  return days === 1 ? "1 day" : `${String(days)} days`;
}
