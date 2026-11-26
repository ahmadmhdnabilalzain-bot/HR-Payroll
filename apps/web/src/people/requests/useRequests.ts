import { useDemo } from "../../demo/state";
import type { ReqStep } from "../../demo/requests-state";
import { personFor } from "../../demo/time-off";
import { useLocale } from "../../i18n/LocaleProvider";
import { useToast } from "../../ui/Toast";
import { dayText } from "../words";
import { stepBy } from "./model";
import { ROLE_WORD } from "./words";

/** Shared by every requests screen: data, store, names and the one way
 * a decision is recorded (who, role, date; a toast with undo). */
export function useRequests() {
  const demo = useDemo();
  const { lang } = useLocale();
  const toast = useToast();
  const { data, state, dispatch } = demo;
  const nameOf = (id: string): string =>
    data.people.person(id)?.name[lang] ?? id;
  const roleOf = (id: string): string =>
    data.people.person(id)?.role[lang] ?? "";
  const when = (iso: string): string => dayText(iso, lang);
  /** "Done by Fatima, HR manager, 27 October". */
  const byLine = (verb: string, step: ReqStep): string =>
    `${verb} by ${nameOf(step.by)}, ${ROLE_WORD[step.role]}, ` +
    when(step.on);
  /** Record a step; the toast says what happened and offers undo. */
  const record = (id: string, status: string, message: string,
    prev: ReqStep | null, note = ""): void => {
    dispatch({ type: "req-step", id,
      step: stepBy(data, state, status, note) });
    toast.show(message, () => dispatch(prev === null
      ? { type: "req-undo", id } : { type: "req-step", id, step: prev }));
  };
  return { data, state, dispatch, lang, toast, nameOf, roleOf, when,
    byLine, record, me: personFor(data, state.role) };
}

export type Requests = ReturnType<typeof useRequests>;
