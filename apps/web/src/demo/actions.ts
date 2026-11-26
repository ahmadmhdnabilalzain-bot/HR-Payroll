import { flushSync } from "react-dom";
import {
  approvalBlockedBy,
  personOf,
  runApprovalId,
  runPhase,
  type RunPhase,
} from "./derive";
import { reducedMotion } from "./motion";
import { canMove, moveWithin } from "../ui/routeMotion";
import { mayOpen } from "../nav/registry";
import { hrefOf, parseHash } from "./route";
import { useDemo, type Role, type Verdict } from "./state";

export interface RunApproval {
  phase: RunPhase;
  /** True for the checker (the GM); everyone else only sees it. */
  isChecker: boolean;
  /** People whose missing bank details hold the whole run back. */
  blockedBy: string[];
  canDecide: boolean;
  decide(verdict: Verdict): void;
}

/**
 * The pay run's approval, shared by Home and the Pay run page so a
 * decision in one shows in the other. The real API refuses a whole run
 * while a payslip has no bank account: `canDecide` is false then.
 */
export function useRunApproval(): RunApproval {
  const { data, state, dispatch } = useDemo();
  const id = runApprovalId(data);
  const blockedBy = approvalBlockedBy(data, state);
  const isChecker = personOf(data, state.role) === data.runPeople()
    .checkerId;
  return { phase: runPhase(data, state), isChecker, blockedBy,
    canDecide: id !== null && isChecker && blockedBy.length === 0 &&
      state.decided[id] === undefined,
    decide: (verdict) => {
      if (id !== null) dispatch({ type: "decide", id, verdict });
    } };
}

/**
 * Switches role as a quick fade-through of the page (ui/routeMotion:
 * the page fades out over 120 ms, then the new one in over 200 ms;
 * the top bar holds still), or at once when motion is reduced. The page
 * goes to its top before the old frame is taken, so no scrolled list
 * ghosts over the new Home.
 */
export function useSwitchRole(): (role: Role, at?: string) => void {
  const { dispatch } = useDemo();
  return (role, at) => {
    // The new role's Home opens at its top, status sentence in view.
    // A page the new role may not open gives way to its Home, so a
    // switch never lands on "outside your view". Decided at the click
    // (`at`, the page then, when the switch waits for a menu to
    // close): a navigation made meanwhile is left alone.
    const from = at ?? location.hash;
    const away = !mayOpen(role, parseHash(from));
    const run = (): void => {
      if (away && location.hash === from) {
        const oldURL = location.href;
        history.pushState(null, "", hrefOf("home"));
        dispatchEvent(new HashChangeEvent("hashchange",
          { oldURL, newURL: location.href }));
      }
      flushSync(() => dispatch({ type: "role", role }));
      scrollTo({ top: 0, left: 0, behavior: "instant" });
    };
    if (!canMove()) {
      run();
      return;
    }
    scrollTo({ top: 0, left: 0, behavior: "instant" });
    moveWithin(0, run);
  };
}

interface Transition { ready?: Promise<unknown>; finished?: Promise<unknown> }

/**
 * A transition skipped by the next one rejects its promises; nothing
 * waits on them here, so they are caught to keep the console clean.
 */
export function quiet(vt: Transition | undefined): void {
  vt?.ready?.catch(() => undefined);
  vt?.finished?.catch(() => undefined);
}
