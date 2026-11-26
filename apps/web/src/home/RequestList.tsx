import { useDemo } from "../demo/state";
import { personFor, type RequestRow } from "../demo/time-off";
import { formatDayMonth } from "../i18n/format";
import type { MessageKey } from "../i18n/t";
import { useLocale } from "../i18n/LocaleProvider";
import b from "../ui/button.module.css";
import { useToast } from "../ui/Toast";
import s from "./Self.module.css";

const STATE: Record<RequestRow["state"], MessageKey> = {
  waiting: "timeoff.legendWaiting", booked: "timeoff.booked",
  declined: "timeoff.declined", withdrawn: "timeoff.withdrawn",
};

/**
 * Leave requests as rows: who, which dates, how long, the state. The
 * approver decides inline; the person who made a new request can
 * withdraw it while it waits. Decisions go through the shared store.
 */
export function RequestList(p: { title: string; rows: RequestRow[];
  empty: string; showName?: boolean }) {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const me = personFor(data, state.role);
  const types = data.people.leaveTypes();
  const nameOf = (id: string): string =>
    data.people.person(id)?.name[lang] ?? "";
  return (
    <section className={s.list} aria-label={p.title}>
      <h2 className={s.listTitle}>{p.title}</h2>
      {p.rows.length === 0 ? <p className={s.empty}>{p.empty}</p> : (
        <ul className={s.rows}>
          {p.rows.map((r) => {
            const type = types.find((x) => x.id === r.leaveTypeId);
            const decide = r.state === "waiting" && r.approverId === me &&
              r.approvalId !== null;
            const verdict = (v: "approve" | "decline") => (): void => {
              dispatch({ type: "decide", id: r.approvalId ?? "",
                verdict: v });
              toast.show(t("timeoff.decidedToast", {
                name: nameOf(r.employeeId),
                verdict: v === "approve" ? t("timeoff.verdictBooked")
                  : t("timeoff.verdictDeclined") }),
              () => dispatch({ type: "undecide", id: r.approvalId ?? "" }));
            };
            return (
              <li key={r.id} className={s.row}>
                <div className={s.rowMain}>
                  <span className={s.rowTitle}>
                    {p.showName === true ? `${nameOf(r.employeeId)} · ` : ""}
                    {type?.name[lang]}
                  </span>
                  <span className={s.meta}>
                    {formatDayMonth(r.startDate, lang)}
                    {r.endDate === r.startDate ? "" :
                      ` – ${formatDayMonth(r.endDate, lang)}`}
                    {" · "}
                    {t("timeoff.workingDays", { count: r.halves / 2,
                      n: String(r.halves / 2) })}
                  </span>
                </div>
                {decide ? (
                  <div className={s.rowActions}>
                    <button type="button" className={`${b.btn}
                      ${b.secondary}`} onClick={verdict("decline")}>
                      {t("timeoff.decline")}</button>
                    <button type="button" className={`${b.btn} ${b.primary}`}
                      onClick={verdict("approve")}>
                      {t("timeoff.approve")}</button>
                  </div>
                ) : r.isNew && r.state === "waiting" &&
                  r.employeeId === me ? (
                  <button type="button" className={`${b.btn} ${b.quiet}`}
                    onClick={() => {
                      dispatch({ type: "withdraw-leave", id: r.id });
                      toast.show(t("timeoff.withdrew"), () =>
                        dispatch({ type: "restore-leave", id: r.id }));
                    }}>{t("timeoff.withdraw")}</button>
                ) : (
                  <span className={s.state} data-state={r.state}>
                    {r.state === "waiting" ? t("timeoff.waitingFor", {
                      name: nameOf(r.approverId),
                      role: data.people.person(r.approverId)?.role[lang]
                        ?? "" }) : t(STATE[r.state])}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
