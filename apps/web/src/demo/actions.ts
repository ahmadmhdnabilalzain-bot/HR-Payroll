import { flushSync } from "react-dom";
import {
  approvalBlockedBy,
  personOf,
  runApprovalId,
  runPhase,
  type RunPhase,
} from "./derive";
import { reducedMotion } from "./motion";
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
 * Switches role with a quiet crossfade of the page (view transitions:
 * 200 ms out, 250 ms in), or at once when motion is reduced.
 */
export function useSwitchRole(): (role: Role) => void {
  const { dispatch } = useDemo();
  return (role) => {
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => Transition;
    };
    // The new role's Home opens at its top, status sentence in view.
    // A page the new role may not open gives way to its Home, so a
    // switch never lands on "outside your view". Decided at the click:
    // a navigation made while the crossfade starts is left alone.
    const from = location.hash;
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
    if (reducedMotion() || typeof doc.startViewTransition !== "function") {
      run();
    } else quiet(doc.startViewTransition(run));
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
