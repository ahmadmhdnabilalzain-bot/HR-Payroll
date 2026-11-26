import type { ReactNode } from "react";
import { useLocale } from "../../i18n/LocaleProvider";
import type { IssueWords } from "./model";
import s from "./dash.module.css";

/** A white panel with a 17 px title and an optional quiet note. */
export function Panel(p: { id: string; title: string; note?: string;
  children: ReactNode; wide?: boolean }) {
  return (
    <section className={s.panel} aria-labelledby={p.id}
      style={p.wide === true ? { gridColumn: "1 / -1" } : undefined}>
      <div className={s.panelHead}>
        <h2 id={p.id} className={s.panelTitle}>{p.title}</h2>
        {p.note !== undefined && <p className={s.panelNote}>{p.note}</p>}
      </div>
      {p.children}
    </section>
  );
}

/**
 * Fix's own words for its counts, so every page says "2 stop pay, 6 to
 * check" exactly as Fix and Home do: the unit after the figure, and
 * the checks line under it.
 */
export function useIssueWords(): IssueWords {
  const { t } = useLocale();
  return (b) => ({
    unit: t("payrun.fixStops", { count: b.stops })
      .replace(/^\S+\s/, ""),
    sub: b.checks === 0 ? t("payrun.fixNoChecks")
      : t("payrun.fixChecks", { count: b.checks }),
  });
}

/** The whole phrase: "2 stop pay, 6 to check". */
export function useIssuePhrase(): (b: { stops: number; checks: number })
  => string {
  const { t } = useLocale();
  return (b) => `${b.stops === 0 ? t("payrun.fixNoStops")
    : t("payrun.fixStops", { count: b.stops })}, ${b.checks === 0
    ? t("payrun.fixNoChecks") : t("payrun.fixChecks", { count: b.checks })}`;
}
