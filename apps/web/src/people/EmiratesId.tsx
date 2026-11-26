import { useEffect } from "react";
import type { Person } from "../demo/data/people-types";
import { personFor } from "../demo/time-off";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import b from "../ui/button.module.css";
import s from "./Profile.module.css";

/**
 * The Emirates ID on a profile: masked, with a Show button for HR only.
 * Show writes one audit entry (who, role, whose, the date) through the
 * demo state and shows this one number; it masks again when HR leaves
 * the profile or switches role. CSV exports always stay masked.
 */
export function EmiratesId(q: { person: Person }) {
  const { t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const id = q.person.id;
  const shown = state.eidShown === id && state.role === "hr";
  useEffect(() => () => dispatch({ type: "eid-hide" }), [id, dispatch]);
  const raw = shown ? data.people.emiratesIdFull(id) : null;
  const full = raw !== null && /^\d{15}$/.test(raw)
    ? `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 14)}-` +
      raw.slice(14) : raw;
  return (
    <span className={s.eid}>
      <span dir="ltr" className="tabular">
        {full ?? q.person.emiratesIdMasked}</span>
      {state.role === "hr" && (
        <button type="button" className={`${b.btn} ${b.quiet}`}
          aria-describedby="eid-note"
          onClick={() => dispatch(shown ? { type: "eid-hide" }
            : { type: "eid-show", entry: { employeeId: id,
              by: personFor(data, state.role), role: state.role,
              on: data.people.asOf } })}>
          {shown ? t("people.eidHide") : t("people.eidShow")}</button>
      )}
      {state.role === "hr" && (
        <span id="eid-note" className={s.eidNote}>
          {shown ? t("people.eidNote") : ""}</span>
      )}
    </span>
  );
}
