import { useRef } from "react";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { panelOf, routeOf } from "../nav/registry";
import { Icon } from "../ui/Icon";
import { BLURB } from "./catalogue";
import { PageHead } from "../ui/templates";
import { useEntrance } from "../ui/templates/listEnter";
import tp from "../ui/templates/templates.module.css";
import s from "./Reports.module.css";
import { Footnote } from "../components/explain";
import { AskBox } from "./ask/AskBox";
import { canAsk } from "./ask/useAsk";

/**
 * Reports home: every report, grouped under a sentence-case label, as
 * a two-column grid of cards (one on a phone), each with the one-line
 * question it answers.
 */
export function Catalogue(p: { autoFocusAsk?: boolean }) {
  const { lang, t } = useLocale();
  const ctx = useDemo();
  const groups = panelOf(ctx.state.role, "reports");
  // The rows rise in once per route; a row's title travels into the
  // report it opens (listMotion.ts).
  const page = useRef<HTMLDivElement>(null);
  useEntrance(page, "ul > li", { scope: "rows" });
  return (
    <div className={tp.page} ref={page}>
      {p.autoFocusAsk === true ? (
        <PageHead title={t("reports.askTitle")} lede={t("reports.askSub")}
          crumbs={[{ label: t("shell.navReports"),
            href: hrefOf("reports") }]} />
      ) : <PageHead title={t("reports.title")} lede={t("reports.sub")} />}
      {groups.length === 0 && (
        <p className={s.sub}>Reports are for the HR manager and the
          General manager.</p>
      )}
      {canAsk(ctx.state.role) && (
        <AskBox autoFocus={p.autoFocusAsk === true}
          titled={p.autoFocusAsk === true} />
      )}
      {groups.map(({ group, areas }) => (
        <section key={group.id} className={s.groupBlock}
          aria-labelledby={`rg-${group.id}`}>
          <h2 id={`rg-${group.id}`} className={s.group}>
            {group.label[lang]}</h2>
          <ul className={s.list}>
            {areas.filter((a) => a.id !== "reports.all" &&
              a.id !== "reports.ask").map((a) => {
              const r = routeOf(a, { data: ctx.data, state: ctx.state });
              return (
                <li key={a.id}>
                  <a href={hrefOf(r.section, ...(r.rest ?? []))}
                    className={s.item} data-row=""
                    data-row-name={a.label[lang]}>
                    <span className={s.itemText} data-row-main="">
                      <span className={s.itemTitle}>{a.label[lang]}</span>
                      <span className={s.itemBlurb}
                        title={BLURB[a.id]}>{BLURB[a.id]}</span>
                    </span>
                    <Icon name="chevronEnd" size={20} />
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <Footnote />
    </div>
  );
}
