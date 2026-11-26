import { flushSync } from "react-dom";
import {
  approvalBlockedBy,
  personOf,
  runApprovalId,
  runPhase,
  type RunPhase,
} from "./derive";
import { reducedMotion } from "./motion";
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
      startViewTransition?: (cb: () => void) => unknown;
    };
    const run = (): void => flushSync(() => dispatch({ type: "role", role }));
    if (reducedMotion() || typeof doc.startViewTransition !== "function") {
      run();
    } else doc.startViewTransition(run);
  };
}
