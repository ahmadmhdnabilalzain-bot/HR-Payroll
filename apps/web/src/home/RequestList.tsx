import { useDemo } from "../demo/state";
import { dayVars } from "../people/words";
import {
  leaveIds,
  overlapsOf,
  personFor,
  requestRows,
  type RequestRow,
} from "../demo/time-off";
import { formatDayMonth, formatList } from "../i18n/format";
import type { MessageKey } from "../i18n/t";
import { useLocale } from "../i18n/LocaleProvider";
import b from "../ui/button.module.css";
import { hrefOf } from "../demo/route";
import { useRowLink } from "../ui/RowLink";
import { useToast } from "../ui/Toast";
import type { ReactNode } from "react";
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
  const all = requestRows(data, state);
  const visible = new Set(leaveIds(data, state));
  /** "Same days as Rafiq Hossain (16 Nov – 20 Nov)", for the approver. */
  const overlap = (r: RequestRow): string => {
    const xs = overlapsOf(all, r, visible);
    return xs.length === 0 ? "" : t("timeoff.overlapsWith", {
      names: formatList(xs.map((x) => `${nameOf(x.employeeId)} (` +
        `${formatDayMonth(x.startDate, lang)} – ` +
        `${formatDayMonth(x.endDate, lang)})`), lang) });
  };
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
              toast.show(t(v === "approve" ? "timeoff.bookedToast"
                : "timeoff.declinedToast", { name: nameOf(r.employeeId) }),
              () => dispatch({ type: "undecide", id: r.approvalId ?? "" }));
            };
            return (
              <LinkRow key={r.id} href={r.employeeId === me
                ? hrefOf("me", "leave") : hrefOf("time-off")}>
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
                    {t("timeoff.workingDays", dayVars(r.halves, lang))}
                  </span>
                  {decide && overlap(r) !== "" && (
                    <span className={s.meta} data-overlap="">
                      {overlap(r)}</span>
                  )}
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
                ) : (
                  <div className={s.rowActions}>
                    <span className={s.state} data-state={r.state}>
                      {r.state === "waiting" ? t("timeoff.waitingFor", {
                        name: nameOf(r.approverId),
                        role: data.people.person(r.approverId)?.role[lang]
                          ?? "" }) : t(STATE[r.state])}
                    </span>
                    {r.isNew && r.state === "waiting" && r.employeeId === me
                      && (
                      <button type="button" className={`${b.btn} ${b.quiet}`}
                        onClick={() => {
                          dispatch({ type: "withdraw-leave", id: r.id });
                          toast.show(t("timeoff.withdrew"), () =>
                            dispatch({ type: "restore-leave", id: r.id }));
                        }}>{t("timeoff.withdraw")}</button>
                    )}
                  </div>
                )}
              </LinkRow>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * A request row that opens its leave (the viewer's own on My leave, a
 * team member's in Time off); Decline, Book and Withdraw keep their
 * own press.
 */
function LinkRow(p: { href: string; children: ReactNode }) {
  const row = useRowLink({ href: p.href });
  return <li {...row} className={`${s.row} ${row.className}`}>
    {p.children}</li>;
}
