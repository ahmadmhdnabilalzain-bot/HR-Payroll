import { useRunApproval } from "../demo/actions";
import { openIssues } from "../demo/derive";
import { useDemo } from "../demo/state";
import { formatLongDay, formatMonthName } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import b from "../ui/button.module.css";
import s from "./StatusLead.module.css";

/**
 * The page leads with one sentence about the pay run and one primary
 * action for the person viewing: HR enters missing bank details; the
 * General Manager approves (disabled, with its reason, while a payslip
 * has no bank account).
 */
export function StatusLead() {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const run = useRunApproval();
  const h = data.headline();
  const month = formatMonthName(h.runMonth, lang);
  const nameOf = (id: string): string => data.employee(id).name[lang];
  const checker = nameOf(data.runPeople().checkerId);
  const held = run.blockedBy;
  const sentence = run.phase === "file" ? t("home.statusFile", { month })
    : run.phase === "approve"
      ? (run.isChecker ? t("home.statusApproveYou", { month })
        : t("home.statusApprove", { month, name: checker }))
      : t("home.statusBank", { month, count: held.length,
        name: nameOf(held[0] ?? "") });
  const firstHeld = openIssues(data, state).find((i) =>
    i.code === "SIF_HELD_NO_IBAN");
  return (
    <header className={s.lead}>
      <p className={s.date}>
        {t("home.dateLine", { date: formatLongDay(data.payCalendar().asOf,
          lang), company: data.companyName[lang] })}
      </p>
      <div className={s.row}>
        <h1 key={sentence} className={s.sentence}>{sentence}</h1>
        <div className={s.action}>
          {run.isChecker && run.phase !== "file" && (
            <>
              <button type="button" className={`${b.btn} ${b.primary}
                ${b.large}`} disabled={!run.canDecide}
                aria-describedby={run.canDecide ? undefined : "approve-why"}
                onClick={() => run.decide("approve")}>
                {t("home.primaryApprove", { month })}
              </button>
              {!run.canDecide && (
                <p id="approve-why" className={s.why}>
                  {t("home.approveWaits", { count: held.length,
                    name: nameOf(held[0] ?? "") })}
                </p>
              )}
            </>
          )}
          {!run.isChecker && firstHeld !== undefined && (
            <button type="button" className={`${b.btn} ${b.primary}
              ${b.large}`} onClick={() => dispatch({ type: "focus-issue",
                id: firstHeld.id })}>
              {t("home.primaryIban")}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
