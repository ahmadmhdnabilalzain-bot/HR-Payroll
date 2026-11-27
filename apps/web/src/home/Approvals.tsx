import { useEffect, useRef } from "react";
import { useRunApproval } from "../demo/actions";
import type { Approval, ApprovalKind } from "../demo/data/types";
import {
  approvalHref,
  approvalsShown,
  decideAction,
  mayDecide,
  undoAction,
} from "../demo/approvals";
import { reducedMotion, useFlip } from "../demo/motion";
import { hrefOf, useRoute } from "../demo/route";
import { useDemo, type Verdict } from "../demo/state";
import { formatDayMonth, formatList } from "../i18n/format";
import type { MessageKey } from "../i18n/t";
import { useLocale } from "../i18n/LocaleProvider";
import b from "../ui/button.module.css";
import { Money } from "../ui/Money";
import { useRowLink } from "../ui/RowLink";
import { useToast } from "../ui/Toast";
import s from "./Side.module.css";
import { Avatar } from "../ui/Avatar";

const KIND: Record<ApprovalKind, MessageKey> = {
  leave: "home.kindLeave", expense: "home.kindExpense",
  "pay-run": "home.kindPayRun", overtime: "home.kindOvertime",
};

/**
 * Everything waiting for a decision, the viewer's own first. Only the
 * checker can decide; everyone else sees who it waits for. The pay run
 * uses the shared run approval, so Home and the Pay run page agree.
 */
export function Approvals() {
  const { t } = useLocale();
  const { data, state } = useDemo();
  const list = approvalsShown(data, state);
  const box = useRef<HTMLUListElement>(null);
  useFlip(box, [list.map((a) => a.id).join(), state.role]);
  // `#/home/decisions` (a dashboard's "Waiting for a decision"): Home,
  // with Decisions brought to view, marked and focused.
  const route = useRoute();
  const asked = route.section === "home" && route.rest[0] === "decisions";
  useEffect(() => {
    if (!asked) return;
    const id = requestAnimationFrame(() => showDecisions());
    return () => cancelAnimationFrame(id);
  }, [asked]);
  return (
    <section className={s.panel} aria-labelledby="approvals-title">
      <header className={s.head}>
        <h2 id="approvals-title" className={s.title}>
          {t("home.approvalsTitle")}
        </h2>
      </header>
      {list.length === 0 ? (
        <p className={s.empty}>{t("home.approvalsEmpty")}</p>
      ) : (
        <ul className={s.list} ref={box}>
          {list.map((a) => <ApprovalRow key={a.id} a={a} />)}
        </ul>
      )}
    </section>
  );
}

export { approvalHref };

/** Where Home's Decisions is, for a link from another page. */
export const DECISIONS_HREF = hrefOf("home", "decisions");

let unflash: ReturnType<typeof setTimeout> | undefined;

/**
 * Bring Decisions into view, outline it for a second (no movement, so
 * the same with reduced motion) and give its title the focus, so the
 * keys carry on from there.
 */
export function showDecisions(): void {
  const to = document.getElementById("approvals-title");
  if (to === null) return;
  to.scrollIntoView({ block: "start",
    behavior: reducedMotion() ? "auto" : "smooth" });
  to.tabIndex = -1;
  to.focus({ preventScroll: true });
  const panel = to.closest("section");
  if (panel === null) return;
  clearTimeout(unflash);
  panel.setAttribute("data-flash", "");
  unflash = setTimeout(() => panel.removeAttribute("data-flash"), 1000);
}

function ApprovalRow(p: { a: Approval }) {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const run = useRunApproval();
  const toast = useToast();
  const a = p.a;
  const isRun = a.kind === "pay-run";
  const mine = mayDecide(data, state.role, a);
  const who = data.employee(a.employeeId ?? a.makerId).name[lang];
  const checker = data.employee(a.checkerId).name[lang];
  const blocked = isRun && !run.canDecide;
  const decide = (verdict: Verdict) => (): void => {
    if (isRun) run.decide(verdict);
    else dispatch(decideAction(data, state.role, a, verdict));
    toast.show(t("home.decided", { title: `${t(KIND[a.kind])} · ${who}` }),
      () => dispatch(undoAction(a)));
  };
  const why = isRun && blocked && run.blockedBy.length > 0
    ? t("home.approveWaits", { names: formatList(run.blockedBy.map((id) =>
      data.employee(id).name[lang]), lang) }) : undefined;
  // The whole row opens its record; Sign off and Decline keep theirs.
  const link = useRowLink({ href: approvalHref(a) });
  return (
    <li data-flip={a.id} id={`approval-${a.id}`}>
      <div {...link}
        className={`${s.row} ${s.linkRow} ${link.className}`}>
      <Avatar id={a.employeeId ?? a.makerId} name={data.employee(
        a.employeeId ?? a.makerId).name.en} />
      <div className={s.main}>
        <span className={s.kind}>{t(KIND[a.kind])}</span>
        <span className={s.what}>{isRun ? t("home.preparedBy",
          { name: who }) : who}</span>
        <span className={s.meta}>
          {isRun ? null : `${a.title[lang]} · `}
          {t("home.requested", { date: formatDayMonth(a.requestedOn,
            lang) })}
        </span>
      </div>
      <div className={s.end}>
        {a.amountFils !== null && <Money value={a.amountFils} size="sm" />}
        {isRun && run.blockedBy.length > 0 ? (
          <span className={s.waitingFor}>{t("home.notSent")}</span>
        ) : mine ? (
          <div className={s.buttons}>
            <button type="button" className={`${b.btn} ${b.secondary}`}
              disabled={blocked} onClick={decide("decline")}>
              {t("home.decline")}
            </button>
            <button type="button" className={`${b.btn} ${b.primary}`}
              disabled={blocked} title={why} onClick={decide("approve")}>
              {t("home.approve")}
            </button>
          </div>
        ) : (
          <span className={s.waitingFor}>
            {t("home.waitingFor", { name: checker })}
          </span>
        )}
      </div>
      {mine && why !== undefined && run.blockedBy.length === 0 &&
        <p className={s.why}>{why}</p>}
      </div>
    </li>
  );
}
