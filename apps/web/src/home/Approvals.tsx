import { useRef } from "react";
import type { Approval, ApprovalKind } from "../demo/data/types";
import { pendingApprovals, personOf } from "../demo/derive";
import { useFlip } from "../demo/motion";
import { useDemo, type Verdict } from "../demo/state";
import { formatDayMonth } from "../i18n/format";
import type { MessageKey } from "../i18n/t";
import { useLocale } from "../i18n/LocaleProvider";
import b from "../ui/button.module.css";
import { Money } from "../ui/Money";
import { useToast } from "../ui/Toast";
import s from "./Side.module.css";

const KIND: Record<ApprovalKind, MessageKey> = {
  leave: "home.kindLeave", expense: "home.kindExpense",
  "pay-run": "home.kindPayRun",
};

/** What waits for the current role; maker and checker always differ. */
export function Approvals() {
  const { t } = useLocale();
  const { data, state } = useDemo();
  const list = pendingApprovals(data, state);
  const box = useRef<HTMLUListElement>(null);
  useFlip(box, [list.map((a) => a.id).join(), state.role]);
  return (
    <section className={s.panel} aria-labelledby="approvals-title">
      <header className={s.head}>
        <h2 id="approvals-title" className={s.title}>
          {t("home.approvalsTitle")}
        </h2>
        <span className={`${s.count} tabular`}>{list.length}</span>
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

function ApprovalRow(p: { a: Approval }) {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const a = p.a;
  const mine = a.checkerId === personOf(data, state.role);
  const checker = data.employee(a.checkerId).name[lang];
  const who = data.employee(a.employeeId ?? a.makerId).name[lang];
  const decide = (verdict: Verdict) => (): void => {
    dispatch({ type: "decide", id: a.id, verdict });
    toast.show(t("home.decided", { title: `${t(KIND[a.kind])} · ${who}` }),
      () => dispatch({ type: "undecide", id: a.id }));
  };
  return (
    <li className={s.row} data-flip={a.id} id={`approval-${a.id}`}>
      <div className={s.main}>
        <span className={s.kind}>{t(KIND[a.kind])}</span>
        <span className={s.what}>{a.title[lang]}</span>
        <span className={s.meta}>
          {a.kind === "pay-run" ? t("home.preparedBy", { name: who })
            : who}
          {" · "}
          {t("home.requested", { date: formatDayMonth(a.requestedOn,
            lang) })}
        </span>
      </div>
      <div className={s.end}>
        {a.amountFils !== null && <Money value={a.amountFils} size="sm" />}
        {mine ? (
          <div className={s.buttons}>
            <button type="button" className={`${b.btn} ${b.secondary}`}
              onClick={decide("decline")}>{t("home.decline")}</button>
            <button type="button" className={`${b.btn} ${b.primary}`}
              onClick={decide("approve")}>{t("home.approve")}</button>
          </div>
        ) : (
          <span className={s.waitingFor}>
            {t("home.waitingFor", { name: checker })}
          </span>
        )}
      </div>
    </li>
  );
}
