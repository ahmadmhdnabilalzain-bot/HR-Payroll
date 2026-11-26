import { useState, type ReactNode } from "react";
import { useLocale } from "../../i18n/LocaleProvider";
import { Icon } from "../Icon";
import { PageHead } from "./PageHead";
import s from "./templates.module.css";

export interface ListColumn<T> {
  key: string;
  label: string;
  /** Right-aligned (numbers, money). */
  end?: boolean;
  render(row: T): ReactNode;
}

/** The first column wraps to two lines; its full text is the title. */
function fullTitle(el: HTMLElement | null): void {
  if (el !== null) el.title = el.textContent?.trim() ?? "";
}

export interface ListSegment<T> {
  id: string;
  label: string;
  match(row: T): boolean;
}

/**
 * LF, list with filters (navigation map, section 4): a search box, a
 * segmented filter with counts, fixed 48 px rows; a row links to its
 * record. On phones each row is two lines: the first column, then the
 * rest. Column 0 is the row's name.
 */
export function FilterList<T>(p: {
  title: string;
  lede?: string;
  columns: ListColumn<T>[];
  rows: T[];
  rowKey(row: T): string;
  /** Words a search should match for this row. */
  searchText?(row: T): string;
  segments?: ListSegment<T>[];
  /** The row's record; undefined leaves that row unlinked. */
  rowHref?(row: T): string | undefined;
  empty: string;
  actions?: ReactNode;
}) {
  const { t } = useLocale();
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState(p.segments?.[0]?.id ?? "");
  const active = p.segments?.find((x) => x.id === seg);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = p.rows.filter((r) => (active === undefined ||
    active.match(r)) && words.every((w) =>
    (p.searchText?.(r) ?? "").toLowerCase().includes(w)));
  return (
    <div className={s.page}>
      <PageHead title={p.title} lede={p.lede} actions={p.actions} />
      <div className={s.toolbar}>
        {p.searchText !== undefined && (
          <label className={s.searchBox}>
            <Icon name="search" />
            <span className="visually-hidden">{t("tpl.search")}</span>
            <input type="search" value={q} placeholder={t("tpl.search")}
              onChange={(e) => setQ(e.target.value)} />
          </label>
        )}
        {p.segments !== undefined && (
          <div className={s.segments} role="group"
            aria-label={t("tpl.filter")}>
            {p.segments.map((x) => (
              <button key={x.id} type="button" aria-pressed={seg === x.id}
                onClick={() => setSeg(x.id)}>
                {x.label}
                <span className="tabular">
                  {p.rows.filter(x.match).length}
                </span>
              </button>
            ))}
          </div>
        )}
        <span className={s.shown} aria-live="polite">
          {t("tpl.shown", { n: shown.length, total: p.rows.length })}
        </span>
      </div>
      {shown.length === 0 ? <p className={s.empty}>{p.empty}</p> : (
        <ul className={s.list} aria-label={p.title}>
          <li className={s.listHead} aria-hidden="true">
            {p.columns.map((c) => (
              <span key={c.key} data-end={c.end === true}>{c.label}</span>
            ))}
          </li>
          {shown.map((r) => {
            const cells = p.columns.map((c, i) => (
              <span key={c.key} className={i === 0 ? s.cellMain : s.cell}
                data-end={c.end === true}>
                <span className={s.cellLabel}>{c.label}</span>
                {i === 0 ? (
                  <span className={s.cellText} ref={fullTitle}>
                    {c.render(r)}
                  </span>
                ) : c.render(r)}
              </span>
            ));
            const href = p.rowHref?.(r);
            return (
              <li key={p.rowKey(r)}>
                {href === undefined ? <div className={s.row}>{cells}</div>
                  : <a className={s.row} href={href}>{cells}</a>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
