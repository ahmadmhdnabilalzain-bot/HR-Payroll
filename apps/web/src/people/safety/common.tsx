import { hrefOf } from "../../demo/route";
import type { SafetyMark } from "../../demo/safety-state";
import { useDemo } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import { useLocale } from "../../i18n/LocaleProvider";
import { useToast } from "../../ui/Toast";
import { dayText } from "../words";

export const safetyHref = (...rest: string[]): string =>
  hrefOf("people", "safety", ...rest);

/** The marks, and the one way a mark is recorded (who, role, date;
 * a message with an undo). */
export function useSafety() {
  const { data, state, dispatch } = useDemo();
  const { lang } = useLocale();
  const toast = useToast();
  const marks = state.safetyMarks;
  const roleOf = (id: string): string =>
    data.people.person(id)?.role[lang] ?? "";
  const nameOf = (id: string): string =>
    data.people.person(id)?.name[lang] ?? id;
  /** "Recorded by Fatima Al Ketbi, HR manager, 27 October". */
  const byLine = (verb: string, m: SafetyMark): string =>
    `${verb} by ${nameOf(m.by)}, ${roleOf(m.by)}, ${dayText(m.on, lang)}`;
  const mark = (key: string, status: string, message: string): void => {
    const prev = marks[key];
    dispatch({ type: "safety-mark", key, mark: { status,
      by: personFor(data, state.role), role: state.role,
      on: data.safety.asOf } });
    toast.show(message, () => dispatch(prev === undefined
      ? { type: "safety-unmark", key }
      : { type: "safety-mark", key, mark: prev }));
  };
  return { data, marks, mark, byLine, nameOf, lang };
}

export type Safety = ReturnType<typeof useSafety>;

/** HR and the General manager (the registry guards the same). */
export function useAllowed(): boolean {
  const { state } = useDemo();
  return state.role === "hr" || state.role === "gm";
}

export type IncidentStatus = "open" | "action-taken" | "closed";

/** An incident's status once this visit's marks are laid over it. */
export function incidentStatus(base: IncidentStatus,
  marks: Record<string, SafetyMark>, id: string): IncidentStatus {
  const m = marks[`inc:${id}`];
  return m === undefined ? base : m.status as IncidentStatus;
}
