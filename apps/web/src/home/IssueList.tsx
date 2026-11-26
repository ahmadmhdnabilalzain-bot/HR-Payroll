import { useRef } from "react";
import { orderedIssues } from "../demo/derive";
import { useFlip, useTweenedNumber } from "../demo/motion";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { IssueRow } from "./IssueRow";
import s from "./IssueList.module.css";

/**
 * Open issues, most serious first, each with its reason, suggested
 * fix and an inline action. A settled issue moves down to "resolved"
 * (the list reorders with FLIP) and can be undone.
 */
export function IssueList() {
  const { t } = useLocale();
  const { data, state } = useDemo();
  const list = orderedIssues(data, state);
  const order = list.map((i) => i.id).join();
  const box = useRef<HTMLOListElement>(null);
  useFlip(box, [order]);
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
    </section>
  );
}
