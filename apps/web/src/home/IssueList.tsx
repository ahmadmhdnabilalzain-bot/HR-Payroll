import { useRef } from "react";
import { confirmations, openThenResolved } from "../demo/derive";
import { useFlip, useTweenedNumber } from "../demo/motion";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { IssueRow } from "./IssueRow";
import s from "./IssueList.module.css";

/**
 * Open issues, most serious first, each with its reason, suggested
 * fix and an inline next step. A settled issue moves down (the list
 * reorders with FLIP) and can be undone. Items waiting on someone
 * outside the system sit apart, under "Needs confirmation".
 */
export function IssueList() {
  const { t } = useLocale();
  const { data, state } = useDemo();
  const list = openThenResolved(data, state);
  const waiting = confirmations(data);
  const box = useRef<HTMLOListElement>(null);
  useFlip(box, [list.map((i) => i.id).join()]);
  const resolvedCount = useTweenedNumber(Object.keys(state.resolved)
    .length);
  return (
    <section className={s.panel} aria-labelledby="issues-title">
      <header className={s.head}>
        <div>
          <h2 id="issues-title" className={s.title}>
            {t("home.issuesTitle")}
          </h2>
          <p className={s.sub}>
            {state.role === "gm" ? t("home.gmNote") : t("home.issuesSub")}
          </p>
        </div>
        {resolvedCount > 0 && (
          <span className={`${s.count} tabular`}>
            {t("home.resolvedToday", { count: resolvedCount })}
          </span>
        )}
      </header>
      <ol className={s.list} ref={box}>
        {list.map((i) => <IssueRow key={i.id} issue={i} />)}
      </ol>
      {waiting.length > 0 && (
        <div className={s.confirm}>
          <h3 className={s.confirmTitle}>{t("home.confirmTitle")}</h3>
          <p className={s.sub}>{t("home.confirmSub")}</p>
          <ol className={s.list}>
            {waiting.map((i) => <IssueRow key={i.id} issue={i} />)}
          </ol>
        </div>
      )}
    </section>
  );
}
