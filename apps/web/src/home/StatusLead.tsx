import { useRunApproval } from "../demo/actions";
import { isBlocking, openIssues, runApprovalId } from "../demo/derive";
import { decisionTime, nowMs, recordDecision } from "../payrun/model";
import { hrefOf } from "../demo/route";
import type { Issue } from "../demo/data/types";
import { useDemo } from "../demo/state";
import {
  formatDayMonth,
  formatList,
  formatLongDay,
  formatMonthName,
  formatTime,
} from "../i18n/format";
import { useRunDetail } from "../demo/useRunDetail";
import { useLocale } from "../i18n/LocaleProvider";
import { useLayoutEffect, useRef, useState } from "react";
import b from "../ui/button.module.css";
import s from "./StatusLead.module.css";
import tl from "./TextLink.module.css";

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
  // Signed here a moment ago: the stamp lands in the card first and
  // the sentence changes after it (from 280 ms).
  const id = runApprovalId(data);
  const at = id === null ? null : decisionTime(id);
  const late = run.phase === "file" && at !== null && nowMs() - at < 2000;
  // The sentence it replaces stays on screen, read by nobody, until the
  // new one comes in, so the slot is never empty.
  const before = useRef(sentence);
  const [ghost, setGhost] = useState<string | null>(null);
  useLayoutEffect(() => {
    if (before.current === sentence) return;
    setGhost(late ? before.current : null);
    before.current = sentence;
  }, [sentence]);
  return (
    <header className={s.lead}>
      <div className={s.slot}>
        <h1 key={sentence} id="run-title" className={s.sentence}
          data-late={late}>
          {sentence}
        </h1>
        {ghost !== null && (
          <p className={`${s.sentence} ${s.ghost}`} aria-hidden="true"
            onAnimationEnd={() => setGhost(null)}>{ghost}</p>
        )}
      </div>
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
  // Who is fixing what holds the sign-off, and since when: the person
  // who prepared the run, at the time the run was prepared.
  const detail = useRunDetail();
  const maker = nameOf(data.runPeople().makerId);
  const since = `${detail.preparedOn}T${detail.preparedAt}:00+04:00`;
  // Pressed while it cannot sign: the reason, said once more, aloud.
  const [tried, setTried] = useState(false);
  return (
    <div className={s.action}>
      {run.isChecker && (run.phase === "approve" ||
        run.phase === "bank-details") && (
        <>
          {/* Focusable while it cannot sign: a press says why. */}
          <button type="button" className={`${b.btn} ${b.primary}
            ${b.large}`} aria-disabled={run.canDecide ? undefined : true}
            aria-describedby={held.length === 0 ? undefined
              : "approve-why"}
            onClick={() => {
              if (!run.canDecide) { setTried(true); return; }
              const id = runApprovalId(data);
              if (id !== null) recordDecision(id);
              run.decide("approve");
            }}>
            {t("home.primaryApprove", { month })}
          </button>
          {!run.canDecide && held.length > 0 && (
            <p id="approve-why" className={s.why}>
              {t("home.approveWaits", { names: names(held) })}
              {" "}
              {t("home.fixingSince", { name: maker,
                date: formatDayMonth(detail.preparedOn, lang),
                time: formatTime(since, lang) })}
              {" "}
              <a className={`${tl.link} ${s.fixLink}`}
                href={hrefOf("pay-run", "fix")}>{t("home.goToFix")}</a>
            </p>
          )}
          <p className={s.blocked} role="status" aria-live="polite"
            id="approve-blocked">
            {tried && !run.canDecide && held.length > 0 && (
              <>
                {/* English starts the sentence with a word ("Two"),
                  which takes the plural form; one passes as 1. */}
                {t("home.approveBlocked", { count: lang === "en" &&
                  held.length > 1 ? countWord(held.length) : held.length,
                name: maker })}
                {" "}
                <a className={`${tl.link} ${s.fixLink}`}
                  href={hrefOf("pay-run", "fix")}>{t("home.goToFix")}</a>
              </>
            )}
          </p>
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

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six",
  "Seven", "Eight", "Nine", "Ten"];

/** "Two" for 2, the digits past ten: a sentence starts with a word. */
function countWord(n: number): string {
  return WORDS[n] ?? String(n);
}
