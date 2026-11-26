import type { ClaimRow, CrewRequest } from "../demo/data/time-types";
import type { DemoState } from "../demo/state";
import type { TimeDecision } from "../demo/time-state";
import type { Tone } from "../people/words";
import type { Who } from "./shared";

export type Phase = "paid" | "waiting" | "accepted" | "declined";

/** Where a claim stands: the package's phase plus what was decided. */
export function phaseOf(c: ClaimRow, s: DemoState): Phase {
  if (c.phase === "paid") return "paid";
  const d: TimeDecision | undefined = s.timeDecided[c.id];
  return d === undefined ? "waiting"
    : d.verdict === "accept" ? "accepted" : "declined";
}

export function crewPhase(c: CrewRequest, s: DemoState): Phase {
  const d: TimeDecision | undefined = s.timeDecided[c.id];
  return d === undefined ? "waiting"
    : d.verdict === "accept" ? "accepted" : "declined";
}

/** The status as a word, its tone, with the one who decides if waiting. */
export function phaseWord(p: Phase, who: Who, decider: string)
  : [string, Tone] {
  switch (p) {
    case "paid": return ["Paid in October", "ok"];
    case "waiting": return [decider === who.me ? "Waiting for you"
      : `Waiting for ${who.name(decider)}`, "warn"];
    case "accepted": return ["Counts in November pay", "done"];
    case "declined": return ["Declined", "neutral"];
  }
}

/** "Accepted by Arjun Menon, Operations manager, 27 October". */
export function decidedLine(d: TimeDecision, who: Who, date: string)
  : string {
  const what = d.verdict === "accept" ? "Accepted" : "Declined";
  return `${what} by ${who.name(d.by)}, ${who.jobOf(d.by)}, ${date}`;
}
