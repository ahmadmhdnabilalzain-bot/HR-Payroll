import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { visibleIds } from "../../demo/time-off";

export const talentHref = (...rest: string[]): string =>
  hrefOf("people", "talent", ...rest);

/** Skills and surveys: HR and the General manager. */
export function useSeesAll(): boolean {
  const { state } = useDemo();
  return state.role === "hr" || state.role === "gm";
}

/** Training also opens for a manager, for their own team only. */
export function useMayTrain(): boolean {
  const { state } = useDemo();
  return state.role === "hr" || state.role === "gm" ||
    state.role === "manager";
}

/** The people whose training the role sees: everyone, or the team. */
export function useScope(): (employeeId: string) => boolean {
  const { data, state } = useDemo();
  if (state.role === "hr" || state.role === "gm") return () => true;
  const ids = new Set(visibleIds(data, state));
  return (id) => ids.has(id);
}
