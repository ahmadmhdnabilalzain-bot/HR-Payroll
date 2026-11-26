import { useMemo } from "react";
import { useDemo } from "../../demo/state";
import { ALL_AREAS } from "../../nav/areas";
import { isReachable, routeOf } from "../../nav/registry";
import type { AskContext } from "./interpret";

/** Ask for a report is for the two roles that read company pay. */
export const canAsk = (role: string): boolean =>
  role === "hr" || role === "gm";

/** The reports this role may open, and the filters the data holds. */
export function useAskContext(): AskContext {
  const { data, state } = useDemo();
  return useMemo(() => {
    const choices = data.checks.templateChoices();
    return {
      reports: canAsk(state.role) ? ALL_AREAS.filter((a) =>
        a.section === "reports" && isReachable(a, state.role) &&
        a.id !== "reports.all" && a.id !== "reports.ask").map((a) => ({
        id: a.id, label: a.label.en,
        rest: routeOf(a, { data, state }).rest ?? [] })) : [],
      months: choices.months, departments: choices.departments,
      runMonth: data.headline().runMonth };
  }, [data, state]);
}
