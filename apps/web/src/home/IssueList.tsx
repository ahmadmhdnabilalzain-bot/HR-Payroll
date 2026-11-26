import { useEffect, useRef, useState } from "react";
import { openIssues } from "../demo/derive";
import { figures } from "../demo/figures";
import { reducedMotion } from "../demo/motion";
import { useListFlip, useSwapIn } from "../ui/templates/listEnter";
import m from "../ui/templates/motion.module.css";
import { useDemo } from "../demo/state";
import { formatMonthName } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import { IssueRow } from "./IssueRow";
import s from "./IssueList.module.css";

/** How many issues show before "N more to review". */
const FIRST = 3;

/**
 * What stands before approval: the open issues, most serious first, at
 * most three at a time with the rest one tap away. The count in the
 * heading is always the number of rows behind it. A settled issue
 * leaves the list (its neighbours slide up) and the toast offers undo.
 */
export function IssueList() {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const [all, setAll] = useState(false);
  const open = openIssues(data, state);
  const at = open.findIndex((i) => i.id === state.focusIssue);
  useEffect(() => {
    if (at >= FIRST) setAll(true);
  }, [at]);
  const shown = all || at >= FIRST ? open : open.slice(0, FIRST);
  const more = open.length - shown.length;
  // A settled issue fades where it stood while the rows below slide up
  // over it (listEnter.ts); the counts swap whole, never through
  // numbers that were not true.
  const host = useRef<HTMLDivElement>(null);
  useListFlip(host, shown.map((i) => i.id));
  const fig = figures(data, state);
  const blocking = fig.blocking;
  const review = fig.toReview;
  const countRef = useRef<HTMLSpanElement>(null);
  useSwapIn(countRef, `${blocking}-${review}-${open.length}`);
  const counts = [blocking > 0 ? t("home.blockCount", { count: blocking })
    : "", review > 0 ? t("home.reviewCount", { count: review }) : ""]
    .filter(Boolean).join(" · ");
  const [opening, setOpening] = useState(!reducedMotion());
  useEffect(() => {
    const h = setTimeout(() => setOpening(false), 900);
    return () => clearTimeout(h);
  }, []);
  return (
    <section className={s.panel} aria-labelledby="issues-title">
      <header className={s.head}>
        <h2 id="issues-title" className={s.title}>
          {fig.signedOff ? t("home.signedOffTitle")
            : t("home.blockersTitle")}
        </h2>
        <span className={`${s.count} tabular`} data-zero={open.length === 0}
          ref={countRef}>
          {open.length === 0 ? t("home.noIssues") : counts}
        </span>
      </header>
      {fig.signedOff ? (
        <p className={s.sub}>{t("home.signedOffNote", { month:
          formatMonthName(data.headline().runMonth, lang) })}</p>
      ) : state.role === "gm" && <p className={s.sub}>{t("home.gmNote")}</p>}
      <div className={m.host} ref={host}>
      {open.length === 0 ? (
        <p className={s.clear}>{t("home.allClear")}</p>
      ) : (
        <ol className={s.list}>
          {shown.map((i, n) => (
            <IssueRow key={i.id} issue={i}
              delay={opening ? n * 90 + 150
                : all && n >= FIRST ? (n - FIRST) * 90 : null} />
          ))}
        </ol>
      )}
      </div>
      {(more > 0 || (all && open.length > FIRST)) && (
        <button type="button" className={s.more}
          aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? t("home.showFewer")
            : t("home.moreToReview", { count: more })}
        </button>
      )}
    </section>
  );
}
