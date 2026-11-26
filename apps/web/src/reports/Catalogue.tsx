import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { panelOf, routeOf } from "../nav/registry";
import { Icon } from "../ui/Icon";
import { BLURB } from "./catalogue";
import { PageHead } from "../ui/templates";
import tp from "../ui/templates/templates.module.css";
import s from "./Reports.module.css";
import { Footnote } from "../components/explain";
import { AskBox } from "./ask/AskBox";
import { canAsk } from "./ask/useAsk";

/** Reports home: every report, grouped, with the question it answers. */
export function Catalogue(p: { autoFocusAsk?: boolean }) {
  const { lang, t } = useLocale();
  const ctx = useDemo();
  const groups = panelOf(ctx.state.role, "reports");
  let n = 0;
  return (
    <div className={tp.page}>
      <PageHead title={t("reports.title")} lede={t("reports.sub")} />
      {groups.length === 0 && (
        <p className={s.sub}>Reports are for the HR manager and the
          General manager.</p>
      )}
      {canAsk(ctx.state.role) && (
        <AskBox autoFocus={p.autoFocusAsk === true} />
      )}
      {groups.map(({ group, areas }) => (
        <section key={group.id} aria-labelledby={`rg-${group.id}`}>
          <h2 id={`rg-${group.id}`} className={s.group}>
            {group.label[lang]}</h2>
          <ul className={s.list}>
            {areas.filter((a) => a.id !== "reports.all" &&
              a.id !== "reports.ask").map((a) => {
              const r = routeOf(a, { data: ctx.data, state: ctx.state });
              return (
                <li key={a.id} style={{ "--i": n++ } as object}>
                  <a href={hrefOf(r.section, ...(r.rest ?? []))}
                    className={s.item}>
                    <span className={s.itemText}>
                      <span className={s.itemTitle}>{a.label[lang]}</span>
                      <span className={s.itemBlurb}>{BLURB[a.id]}</span>
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
