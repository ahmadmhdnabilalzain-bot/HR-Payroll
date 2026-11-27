import type { ReactNode } from "react";
import { useLocale } from "../../i18n/LocaleProvider";
import type { IssueWords } from "./model";
import s from "./dash.module.css";

/** A white panel with a 17 px title and an optional quiet note. */
export function Panel(p: { id: string; title: string; note?: string;
  children: ReactNode; wide?: boolean;
  /** The page behind the panel: the title opens it. */
  href?: string }) {
  return (
    <section className={s.panel} aria-labelledby={p.id} data-reveal-part=""
      style={p.wide === true ? { gridColumn: "1 / -1" } : undefined}>
      <div className={s.panelHead}>
        <h2 id={p.id} className={s.panelTitle}>
          {p.href === undefined ? p.title
            : <a className={s.panelLink} href={p.href}>{p.title}</a>}
        </h2>
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
  const checks = (n: number): string => n === 0
    ? t("payrun.fixNoChecks") : t("payrun.fixChecks", { count: n });
  // Nothing stops pay: no unit after the 0, and Fix's whole phrase
  // under it ("nothing stops pay, 6 to check").
  const to = (b: { checks: number }): { unit: string; sub: string } =>
    ({ unit: checks(b.checks).replace(/^\S+\s/, ""),
      sub: t("payrun.fixNoStops") });
  return (b) => ({ ...(b.stops === 0
    ? { unit: "", sub: `${t("payrun.fixNoStops")}, ${checks(b.checks)}` }
    : { unit: t("payrun.fixStops", { count: b.stops })
      .replace(/^\S+\s/, ""), sub: checks(b.checks) }), calm: to(b) });
}

/** The whole phrase: "2 stop pay, 6 to check". */
export function useIssuePhrase(): (b: { stops: number; checks: number })
  => string {
  const { t } = useLocale();
  return (b) => `${b.stops === 0 ? t("payrun.fixNoStops")
    : t("payrun.fixStops", { count: b.stops })}, ${b.checks === 0
    ? t("payrun.fixNoChecks") : t("payrun.fixChecks", { count: b.checks })}`;
}
