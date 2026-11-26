import type { LeaveTypeId } from "../demo/data/people-types";
import { hrefOf } from "../demo/route";
import { useDemo, type Verdict } from "../demo/state";
import {
  personFor,
  requestRows,
  leaveIds,
  ownLeaveOnly,
  type RequestRow,
} from "../demo/time-off";
import type { MessageKey } from "../i18n/t";
import { useLocale } from "../i18n/LocaleProvider";
import { dayText, daysText, rangeText, type Tone } from "../people/words";
import b from "../ui/button.module.css";
import { useToast } from "../ui/Toast";
import p from "../people/page.module.css";
import s from "./timeoff.module.css";

const TYPE: Record<LeaveTypeId, MessageKey> = {
  "lt-annual": "timeoff.annual", "lt-sick": "timeoff.sick",
  "lt-unpaid": "timeoff.unpaid",
};

/** The status as words, with the named person, role and date. */
export function statusOf(r: RequestRow, d: ReturnType<typeof useDemo>,
  t: ReturnType<typeof useLocale>["t"], lang: "en" | "ar")
  : [string, Tone] {
  const who = d.data.people.person(r.approverId);
  const name = who?.name[lang] ?? "";
  const role = who?.role[lang] ?? "";
  const date = r.decidedOn === null ? "" : dayText(r.decidedOn, lang);
  switch (r.state) {
    case "waiting": return [t("timeoff.waitingFor", { name, role }), "warn"];
    case "booked": return [r.decidedOn === null ? t("timeoff.booked")
      : t("timeoff.bookedBy", { name, role, date }), "done"];
    case "declined": return [r.decidedOn === null ? t("timeoff.declined")
      : t("timeoff.declinedBy", { name, role, date }), "danger"];
    case "withdrawn": return [t("timeoff.withdrawn"), "neutral"];
  }
}

/**
 * The requests this role may see. What waits for the current person's
 * decision comes first, with Approve and Decline; everyone else sees
 * who it waits for. A new request can be withdrawn while it waits.
 */
export function Requests(q: { fresh: string | null }) {
  const { t } = useLocale();
  const demo = useDemo();
  const { data, state } = demo;
  const me = personFor(data, state.role);
  const ids = new Set(leaveIds(data, state));
  const rows = requestRows(data, state).filter((r) => ids.has(r.employeeId));
  const mine = (r: RequestRow): boolean =>
    r.state === "waiting" && r.approverId === me;
  const ordered = [...rows.filter(mine), ...rows.filter((r) => !mine(r))];
  const forMe = rows.filter(mine).length;
  const onlyOwn = ownLeaveOnly(state);
  return (
    <section className={p.section} aria-labelledby="req-title">
      <header className={p.sectionHead}>
        <h2 id="req-title" className={p.sectionTitle}>
          {onlyOwn ? t("timeoff.requestsMine") : t("timeoff.requests")}
        </h2>
        {forMe > 0 && (
          <span className={s.needs} aria-live="polite">
            {t("timeoff.needsYou", { count: forMe })}
          </span>
        )}
      </header>
      {ordered.length === 0 ? (
        <p className={p.empty}>{t(onlyOwn ? "timeoff.requestsEmpty"
          : "timeoff.requestsEmptyAll")}</p>
      ) : (
        <ul className={s.requests}>
          {ordered.map((r) => (
            <Row key={r.id} r={r} showName={!onlyOwn} mine={mine(r)}
              fresh={r.id === q.fresh} me={me} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Row(q: { r: RequestRow; showName: boolean; mine: boolean;
  fresh: boolean; me: string }) {
  const { lang, t } = useLocale();
  const demo = useDemo();
  const { data, dispatch } = demo;
  const toast = useToast();
  const r = q.r;
  const who = data.people.person(r.employeeId);
  const [said, tone] = statusOf(r, demo, t, lang);
  const status = q.mine ? t("timeoff.waitingForYou") : said;
  const name = who?.name[lang] ?? "";
  const decide = (verdict: Verdict) => (): void => {
    if (r.approvalId === null) return;
    const id = r.approvalId;
    dispatch({ type: "decide", id, verdict });
    toast.show(t(verdict === "approve" ? "timeoff.bookedToast"
      : "timeoff.declinedToast", { name }),
    () => dispatch({ type: "undecide", id }));
  };
  const withdraw = (): void => {
    dispatch({ type: "withdraw-leave", id: r.id });
    toast.show(t("timeoff.withdrew"),
      () => dispatch({ type: "restore-leave", id: r.id }));
  };
  const own = r.employeeId === q.me;
  return (
    <li className={s.request} data-fresh={q.fresh}
      data-state={r.state}>
      <div className={s.reqMain}>
        {q.showName && (
          <a className={s.reqName} href={hrefOf("people", r.employeeId)}>
            {name}
          </a>
        )}
        <span className={s.reqWhat}>
          <span>{t(TYPE[r.leaveTypeId])}</span>
          <span className={s.reqDates}>
            {rangeText(r.startDate, r.endDate, lang)}
          </span>
          <span className={`${s.reqDays} tabular`}>
            {daysText(r.halves, t, lang)}
          </span>
        </span>
        {(r.reason.en !== "" || r.note !== "") && (
          <span className={s.reqReason}>
            {[r.reason[lang], r.note].filter((x) => x !== "").join(" · ")}
          </span>
        )}
      </div>
      <div className={s.reqEnd}>
        <span className={`${p.status} ${s.reqStatus}`} data-tone={tone}>
          {status}
        </span>
        {q.mine && (
          <div className={s.buttons}>
            <button type="button"
              className={`${b.btn} ${b.secondary} ${p.tall}`}
              onClick={decide("decline")}>{t("timeoff.decline")}</button>
            <button type="button" className={`${b.btn} ${b.primary} ${p.tall}`}
              onClick={decide("approve")}>{t("timeoff.approve")}</button>
          </div>
        )}
        {own && r.isNew && r.state === "waiting" && (
          <button type="button" className={`${b.btn} ${b.quiet} ${p.tall}`}
            onClick={withdraw}>{t("timeoff.withdraw")}</button>
        )}
      </div>
    </li>
  );
}
