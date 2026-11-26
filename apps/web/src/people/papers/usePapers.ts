import { useDemo } from "../../demo/state";
import type { PaperStep } from "../../demo/papers-state";
import { personFor } from "../../demo/time-off";
import { useLocale } from "../../i18n/LocaleProvider";
import { useToast } from "../../ui/Toast";
import { dayText } from "../words";
import { stepBy } from "./model";

/** Shared by every papers screen: data, store, names and the one way
 * a decision is recorded (who, role, date; a toast with undo). */
export function usePapers() {
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
  const byLine = (verb: string, step: PaperStep): string =>
    `${verb} by ${nameOf(step.by)}, ${roleOf(step.by)}, ${when(step.on)}`;
  /** Record a step; the toast says what happened and offers undo. */
  const record = (id: string, status: string, message: string,
    prev: PaperStep | null): void => {
    dispatch({ type: "paper-step", id,
      step: stepBy(data, state, status) });
    toast.show(message, () => dispatch(prev === null
      ? { type: "paper-undo", id }
      : { type: "paper-step", id, step: prev }));
  };
  return { data, state, dispatch, lang, toast, nameOf, roleOf, when,
    byLine, record, me: personFor(data, state.role) };
}

export type Papers = ReturnType<typeof usePapers>;
