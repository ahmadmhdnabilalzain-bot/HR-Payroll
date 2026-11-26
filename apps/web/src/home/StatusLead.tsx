import { useRunApproval } from "../demo/actions";
import { isBlocking, openIssues } from "../demo/derive";
import { hrefOf } from "../demo/route";
import type { Issue } from "../demo/data/types";
import { useDemo } from "../demo/state";
import {
  formatList,
  formatLongDay,
  formatMonthName,
} from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import b from "../ui/button.module.css";
import s from "./StatusLead.module.css";

/**
 * The page leads with one sentence about the pay run, in the shared
 * title slot (28 at the column, the date line under it), above the
 * top card.
 */
export function StatusSentence() {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const run = useRunApproval();
  const h = data.headline();
  const month = formatMonthName(h.runMonth, lang);
  const checker = data.employee(data.runPeople().checkerId).name[lang]
    .replace(/ /g, "\u00a0");
  const sentence = run.phase === "file" ? t("home.statusFile", { month })
    : run.phase === "declined" ? t("home.statusDeclined", { month })
    : run.phase === "approve"
      ? (run.isChecker ? t("home.statusApproveYou", { month })
        : t("home.statusApprove", { month, name: checker }))
      : t("home.statusBank", { month, count: run.blockedBy.length });
  return (
    <header className={s.lead}>
      <h1 key={sentence} id="run-title" className={s.sentence}>
        {sentence}
      </h1>
      <p className={s.date}>
        {t("home.dateLine", { date: formatLongDay(data.payCalendar().asOf,
          lang), company: data.companyName[lang] })}
      </p>
    </header>
  );
}

/**
 * The one primary action for the person viewing: HR enters missing
 * bank details; the General Manager approves (disabled, with its
 * reason, while a payslip has no bank account).
 */
export function StatusAction(p: { onIban?(issue: Issue): void }) {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const run = useRunApproval();
  const month = formatMonthName(data.headline().runMonth, lang);
  const nameOf = (id: string): string =>
    data.employee(id).name[lang].replace(/ /g, "\u00a0");
  const names = (ids: string[]): string => formatList(ids.map(nameOf), lang);
  const held = run.blockedBy;
  const firstHeld = openIssues(data, state).find(isBlocking);
  return (
    <div className={s.action}>
      {run.isChecker && (run.phase === "approve" ||
        run.phase === "bank-details") && (
        <>
          <button type="button" className={`${b.btn} ${b.primary}
            ${b.large}`} disabled={!run.canDecide}
            aria-describedby={held.length === 0 ? undefined
              : "approve-why"}
            onClick={() => run.decide("approve")}>
            {t("home.primaryApprove", { month })}
          </button>
          {!run.canDecide && held.length > 0 && (
            <p id="approve-why" className={s.why}>
              {t("home.approveWaits", { names: names(held) })}
            </p>
          )}
        </>
      )}
      {!run.isChecker && firstHeld === undefined &&
        run.phase !== "bank-details" && (
        <a className={`${b.btn} ${b.primary} ${b.large}`}
          href={run.phase === "file" ? hrefOf("pay-run", "pay")
            : hrefOf("pay-run", "approve")}>
          {run.phase === "file" ? t("home.primaryOpenPay")
            : t("home.primaryOpenRun")}
        </a>
      )}
      {run.isChecker && (run.phase === "file" ||
        run.phase === "declined") && (
        <a className={`${b.btn} ${b.secondary} ${b.large}`}
          href={hrefOf("pay-run", run.phase === "file" ? "pay"
            : "approve")}>
          {run.phase === "file" ? t("home.primaryOpenPay")
            : t("home.primaryOpenRun")}
        </a>
      )}
      {!run.isChecker && firstHeld !== undefined && (
        <button type="button" className={`${b.btn} ${b.primary}
          ${b.large}`} onClick={() => p.onIban !== undefined
            ? p.onIban(firstHeld)
            : dispatch({ type: "focus-issue", id: firstHeld.id })}>
          {t("home.primaryIban")}
        </button>
      )}
    </div>
  );
}
