import type { ReactNode } from "react";
import { useLocale } from "../../i18n/LocaleProvider";
import s from "./templates.module.css";

export interface Crumb {
  label: string;
  href: string;
}

/**
 * Every page's head, on every template: 40 px under the bar, a
 * breadcrumb row (always reserved, so the title sits at the same y on
 * every page), the h1 (34/40), a subtitle (17/24, 72ch) and the actions
 * on the title's line. At most one filled button goes in `actions`.
 * `meta` is a line under the subtitle (a period stepper, a status).
 */
export function PageHead(p: { title: string; lede?: string | undefined;
  actions?: ReactNode;
  back?: { label: string; href: string } | undefined;
  crumbs?: Crumb[] | undefined;
  /** Beside the title: a status pill. */
  badge?: ReactNode;
  meta?: ReactNode;
  id?: string }) {
  const { t } = useLocale();
  const trail = p.crumbs ?? (p.back === undefined ? [] : [p.back]);
  return (
    <header className={s.head}>
      {trail.length === 0 ? <div className={s.crumbs} aria-hidden="true" />
        : (
          <nav className={s.crumbs} aria-label={t("shell.breadcrumb")}>
            <ol>
              {trail.map((c) => (
                <li key={c.href}>
                  <a href={c.href}>{c.label}</a>
                  <span aria-hidden="true" className={s.sep}>/</span>
                </li>
              ))}
              <li><span aria-current="page">{p.title}</span></li>
            </ol>
          </nav>
        )}
      <div className={s.headRow}>
        <div className={s.titleWrap}>
          <h1 className={s.title} id={p.id}>{p.title}</h1>
          {p.badge}
        </div>
        {p.actions !== undefined && p.actions !== null &&
          p.actions !== false && (
          <div className={s.actions}>{p.actions}</div>
        )}
      </div>
      {p.lede !== undefined && p.lede !== "" && (
        <p className={s.lede}>{p.lede}</p>
      )}
      {p.meta !== undefined && <div className={s.meta}>{p.meta}</div>}
    </header>
  );
}
