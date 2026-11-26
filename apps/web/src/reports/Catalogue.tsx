import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { panelOf, routeOf } from "../nav/registry";
import { Icon } from "../ui/Icon";
import { BLURB } from "./catalogue";
import s from "./Reports.module.css";

/** Reports home: every report, grouped, with the question it answers. */
export function Catalogue() {
  const { lang, t } = useLocale();
  const ctx = useDemo();
  const groups = panelOf(ctx.state.role, "reports");
  let n = 0;
  return (
    <>
      <header className={s.header}>
        <h1 className={s.title}>{t("reports.title")}</h1>
        <p className={s.sub}>{t("reports.sub")}</p>
      </header>
      {groups.length === 0 && (
        <p className={s.sub}>Reports are for the HR manager and the
          General manager.</p>
      )}
      {groups.map(({ group, areas }) => (
        <section key={group.id} aria-labelledby={`rg-${group.id}`}>
          <h2 id={`rg-${group.id}`} className={s.group}>
            {group.label[lang]}</h2>
          <ul className={s.list}>
            {areas.map((a) => {
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
    </>
  );
}
