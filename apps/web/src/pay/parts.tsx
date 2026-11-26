import type { ReactNode } from "react";
import { useSwitchRole } from "../demo/actions";
import { personOf } from "../demo/derive";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import b from "../ui/button.module.css";
import { useToast } from "../ui/Toast";
import { PageHead, RowDecision } from "../ui/templates";
import { dayMonth, requestState, type RequestState, whoIs } from "./derive";
import type { PayRequest } from "./pay-state";
import s from "./pay.module.css";

export type Tone = "neutral" | "done" | "check" | "bad";

/** Status as a word beside an 8 px dot; the word stays neutral. */
export function Status(p: { tone: Tone; children: ReactNode }) {
  return (
    <span className={s.status}>
      <span className={s.dot} data-tone={p.tone} aria-hidden="true" />
      {p.children}
    </span>
  );
}

export const REQUEST_WORD: Record<RequestState, string> = {
  waiting: "Waiting", agreed: "Agreed", declined: "Declined",
  withdrawn: "Withdrawn",
};

export const REQUEST_TONE: Record<RequestState, Tone> = {
  waiting: "check", agreed: "done", declined: "neutral",
  withdrawn: "neutral",
};

export function RequestStatus(p: { r: PayRequest }) {
  const { state } = useDemo();
  const st = requestState(state, p.r);
  return <Status tone={REQUEST_TONE[st]}>{REQUEST_WORD[st]}</Status>;
}

/** Pay records are for HR and the General Manager only. */
export function NotFound(p: { what: string; back: { label: string;
  href: string } }) {
  return (
    <div className={s.page}>
      <PageHead title={`No such ${p.what}`} back={p.back}
        lede={`There is no ${p.what} at this address. Go back to the list ` +
          "to pick another."} />
    </div>
  );
}

export const Loading = () => (
  <div className={s.page}><p className={s.loading}>Loading pay records</p>
  </div>
);

/** "Agreed by Khalid Al Nuaimi, General manager, 27 October". */
function decidedLine(st: RequestState, who: string, date: string): string {
  return `${st === "agreed" ? "Agreed" : "Declined"} by ${who}, ${date}`;
}

/**
 * A request made in the demo: who prepared it, who decides, and the
 * decision. Only the checker (the GM) decides; HR can view the screen
 * as the GM, or withdraw while it waits. Every step can be undone.
 */
export function RequestPanel(p: { r: PayRequest; what: string }) {
  const { lang } = useLocale();
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const switchRole = useSwitchRole();
  const st = requestState(state, p.r);
  const me = personOf(data, state.role);
  const isChecker = me === p.r.checkerId;
  const gmDecides = p.r.checkerId === data.runPeople().checkerId;
  const today = dayMonth(data.payCalendar().asOf, lang);
  const checker = whoIs(data, p.r.checkerId);
  const decide = (v: "approve" | "decline"): void => {
    dispatch({ type: "decide", id: p.r.approvalId, verdict: v });
    toast.show(v === "approve" ? `${p.what} agreed` : `${p.what} declined`,
      () => dispatch({ type: "undecide", id: p.r.approvalId }));
  };
  return (
    <section className={s.section} aria-label="Decision">
      <ol className={s.chain}>
        <li className={s.chainItem} data-state="done">
          <span className={s.node} aria-hidden="true">
            <Icon name="check" size={14} />
          </span>
          <div>
            <p className={s.chainLabel}>Prepared</p>
            <p className={s.chainWho}>{whoIs(data, p.r.makerId)}</p>
            <p className={s.chainLabel}>
              {dayMonth(p.r.requestedOn, lang)}</p>
          </div>
        </li>
        <li className={s.chainItem} data-state={st === "agreed" ? "done"
          : st === "declined" ? "bad" : "now"}>
          <span className={s.node} aria-hidden="true">
            {st === "agreed" ? <Icon name="check" size={14} />
              : st === "declined" ? <Icon name="x" size={14} /> : null}
          </span>
          <div>
            <p className={s.chainLabel}>Decision</p>
            <p className={s.chainWho}>
              {st === "waiting" ? `Waiting for ${checker}`
                : st === "withdrawn" ? "Withdrawn before a decision"
                  : decidedLine(st, checker, today)}
            </p>
          </div>
        </li>
      </ol>
      {st === "waiting" && isChecker && (
        <div className={s.decide}>
          <p>You decide this request. It can be undone for a few
            seconds.</p>
          <button type="button" className={`${b.btn} ${b.primary}`}
            onClick={() => decide("approve")}>Agree</button>
          <button type="button" className={`${b.btn} ${b.quiet}`}
            onClick={() => decide("decline")}>Decline</button>
        </div>
      )}
      {st === "waiting" && !isChecker && (
        <div className={s.decide}>
          <p>{`Only ${data.employee(p.r.checkerId).name.en} can decide.`}</p>
          <button type="button" className={`${b.btn} ${b.secondary}`}
            onClick={() => switchRole(gmDecides ? "gm" : "hr")}>
            {gmDecides ? "View as General Manager" : "View as HR manager"}
          </button>
          {me === p.r.makerId && (
            <button type="button" className={`${b.btn} ${b.quiet}`}
              onClick={() => {
                dispatch({ type: "pay-withdraw", id: p.r.id });
                toast.show(`${p.what} withdrawn`, () =>
                  dispatch({ type: "pay-restore", id: p.r.id }));
              }}>Withdraw</button>
          )}
        </div>
      )}
      {st !== "waiting" && st !== "withdrawn" && isChecker && (
        <div className={s.decide}>
          <p>Changed your mind? The decision can be taken back.</p>
          <button type="button" className={`${b.btn} ${b.quiet}`}
            onClick={() => dispatch({ type: "undecide",
              id: p.r.approvalId })}>Take back decision</button>
        </div>
      )}
    </section>
  );
}

/**
 * A request's decision on its list row: Agree and Decline for the
 * checker (the same rule as RequestPanel), who it waits for otherwise,
 * and Undo for the checker once decided. `decide` records who, role and
 * date; the toast offers undo.
 */
export function RequestRow(p: { r: PayRequest | null; what: string }) {
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const r = p.r;
  if (r === null) return null;
  const st = requestState(state, r);
  if (st === "withdrawn") return null;
  const mine = personOf(data, state.role) === r.checkerId;
  const decide = (v: "approve" | "decline") => (): void => {
    dispatch({ type: "decide", id: r.approvalId, verdict: v });
    toast.show(v === "approve" ? `${p.what} agreed` : `${p.what} declined`,
      () => dispatch({ type: "undecide", id: r.approvalId }));
  };
  return (
    <RowDecision open={st === "waiting"} mine={mine}
      waitingFor={data.employee(r.checkerId).name.en}
      yes={{ label: "Agree", run: decide("approve") }}
      no={{ label: "Decline", run: decide("decline") }}
      undo={mine ? () => dispatch({ type: "undecide",
        id: r.approvalId }) : undefined} />
  );
}

/**
 * Maker and checker for a new pay request: the viewer prepares it and
 * the General Manager decides; when the GM prepares it, the HR manager
 * decides, so the two always differ (as with leave).
 */
export function useMakerChecker(): { makerId: string; checkerId: string;
  maker: string; checker: string; today: string } {
  const { data, state } = useDemo();
  const r = data.runPeople();
  const makerId = personOf(data, state.role);
  const checkerId = makerId === r.checkerId ? r.makerId : r.checkerId;
  return { makerId, checkerId, maker: whoIs(data, makerId),
    checker: whoIs(data, checkerId), today: data.payCalendar().asOf };
}

/** Pay records are HR's and the GM's: the shell's refusal. */
export { Outside } from "../shell/Outside";
