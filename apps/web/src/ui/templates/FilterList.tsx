import { useEffect, useState, type ReactNode } from "react";
import { useLocale } from "../../i18n/LocaleProvider";
import { Icon } from "../Icon";
import { Avatar } from "../Avatar";
import b from "../button.module.css";
import { PageFoot } from "./PageFoot";
import { lastRecord, saveView, savedView } from "./listMotion";
import { maskNode, useMaskText } from "../mask";
import { PageHead, type Crumb } from "./PageHead";
import s from "./templates.module.css";

export interface ListColumn<T> {
  key: string;
  label: string;
  /** Right-aligned (numbers, money). */
  end?: boolean;
  render(row: T): ReactNode;
}

export interface ListSegment<T> {
  id: string;
  label: string;
  match(row: T): boolean;
}

/** A short list's summary band: a count by status. */
export interface ListSummary {
  label: string;
  value: ReactNode;
}

/**
 * The column headers stick under the app bar: its height (the demo
 * strip and the bar, which differ on phones) goes in --bar-h.
 */
function useBarHeight(): void {
  useEffect(() => {
    const bar = document.querySelector("header");
    if (bar === null || getComputedStyle(bar).position !== "sticky") {
      return undefined;
    }
    const put = (): void => {
      const top = parseFloat(getComputedStyle(bar).top) || 0;
      document.documentElement.style.setProperty("--bar-h",
        `${top + bar.offsetHeight}px`);
    };
    put();
    const watch = new ResizeObserver(put);
    watch.observe(bar);
    return () => watch.disconnect();
  }, []);
}

/** At this many rows or fewer, a summary band sits above the table. */
export const SHORT_LIST = 5;

const isAll = (id: string, label: string): boolean =>
  id === "all" || /^all\b/i.test(label);

/** The band's figures: each segment but "All", else the count. */
function bandOf<T>(rows: T[], segs: ListSegment<T>[] | undefined,
  total: string): ListSummary[] {
  const out = (segs ?? []).filter((x) => !isAll(x.id, x.label))
    .map((x) => ({ label: x.label, value: rows.filter(x.match).length }));
  return out.length > 0 ? out : [{ label: total, value: rows.length }];
}

/**
 * LF, list with filters (navigation map, section 4): a search box, a
 * segmented filter with counts (it scrolls sideways past four), sticky
 * column headers, 56 px rows; a row links to its record. Column 0 is
 * the row's name: it wraps, it is never cut, and `avatar` puts the
 * person's initials beside it. `rowActions` puts buttons on the row
 * (an approval's Accept and Decline) in a column of their own.
 * Five rows or fewer get a summary band above. On phones each row is
 * two lines: the first column, then the rest.
 */
export function FilterList<T>(p: {
  title: string;
  lede?: string;
  back?: { label: string; href: string };
  crumbs?: Crumb[];
  columns: ListColumn<T>[];
  rows: T[];
  rowKey(row: T): string;
  /** Words a search should match for this row. */
  searchText?(row: T): string;
  searchPlaceholder?: string;
  /** More filters beside the search (a department picker). */
  filters?: ReactNode;
  segments?: ListSegment<T>[];
  /** The row's record; undefined leaves that row unlinked. */
  rowHref?(row: T): string | undefined;
  /** The person a row is about: their face beside the first column. */
  avatar?(row: T): { id: string; name: string } | undefined;
  /** Buttons on the row (secondary only; one filled button a page). */
  rowActions?(row: T): ReactNode;
  /** The short-list band; by default the segments' counts. */
  summary?: ListSummary[];
  empty: string;
  /** One action under the empty sentence. */
  emptyAction?: ReactNode;
  actions?: ReactNode;
  /** A line under the lede (a figure, a status, page controls). */
  meta?: ReactNode;
}) {
  const { t } = useLocale();
  useBarHeight();
  // Search and filter outlive a trip to a record and back.
  const [key] = useState(() => location.hash);
  const [q, setQRaw] = useState(() => savedView()?.q ?? "");
  const [seg, setSegRaw] = useState(() => savedView()?.seg ??
    p.segments?.[0]?.id ?? "");
  const setQ = (v: string): void => {
    setQRaw(v);
    saveView(key, { q: v, seg });
  };
  const setSeg = (v: string): void => {
    setSegRaw(v);
    saveView(key, { q, seg: v });
  };
  const active = p.segments?.find((x) => x.id === seg);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = p.rows.filter((r) => (active === undefined ||
    active.match(r)) && words.every((w) =>
    (p.searchText?.(r) ?? "").toLowerCase().includes(w)));
  const band = p.rows.length > 0 && p.rows.length <= SHORT_LIST
    ? p.summary ?? bandOf(p.rows, p.segments, t("tpl.inList")) : [];
  const many = (p.segments?.length ?? 0) > 4;
  return (
    <div className={s.page}>
      <PageHead title={p.title} lede={p.lede} actions={p.actions}
        back={p.back} crumbs={p.crumbs} meta={p.meta} />
      {band.length > 0 && (
        <dl className={s.band} aria-label={t("tpl.summary")}>
          {band.map((x) => (
            <div key={x.label}>
              <dd className="tabular">{x.value}</dd>
              <dt>{x.label}</dt>
            </div>
          ))}
        </dl>
      )}
      <div className={s.toolbar}>
        {p.searchText !== undefined && (
          <label className={s.searchBox}>
            <Icon name="search" />
            <span className="visually-hidden">{t("tpl.search")}</span>
            <input type="search" value={q} autoComplete="off"
              placeholder={p.searchPlaceholder ?? t("tpl.search")}
              onChange={(e) => setQ(e.target.value)} />
          </label>
        )}
        {p.filters}
        {p.segments !== undefined && (
          <div className={s.segScroll} data-many={many}>
            <div className={s.segments} role="group"
              aria-label={t("tpl.filter")}>
              {p.segments.map((x) => (
                <button key={x.id} type="button"
                  aria-pressed={seg === x.id}
                  onClick={() => setSeg(x.id)}>
                  {x.label}
                  <span className="tabular">
                    {p.rows.filter(x.match).length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        <span className={s.shown} aria-live="polite">
          {t("tpl.shown", { n: shown.length, total: p.rows.length })}
        </span>
      </div>
      {shown.length === 0 ? (
        <div className={s.emptyState}>
          {p.rows.length > 0 && (q !== "" || active !== p.segments?.[0]) ? (
            <>
              <p>{t("tpl.noMatch")}</p>
              <button type="button" className={`${b.btn} ${b.secondary}`}
                onClick={() => {
                  setQRaw("");
                  setSegRaw(p.segments?.[0]?.id ?? "");
                  saveView(key, { q: "", seg: p.segments?.[0]?.id ?? "" });
                }}>{t("tpl.clearAll")}</button>
            </>
          ) : (
            <>
              <p>{p.empty}</p>
              {p.emptyAction}
            </>
          )}
        </div>
      ) : (
        <ul className={s.list} aria-label={p.title}
          data-avatar={p.avatar !== undefined}>
          <li className={p.rowActions === undefined ? undefined
            : s.actRow} aria-hidden="true">
            <span className={s.listHead}>
              {p.columns.map((c) => (
                <span key={c.key} data-end={c.end === true}>{c.label}</span>
              ))}
            </span>
            {p.rowActions !== undefined && <span className={s.headActs} />}
          </li>
          {shown.map((r) => <Row key={p.rowKey(r)} p={p} r={r} />)}
        </ul>
      )}
      <PageFoot />
    </div>
  );
}

type RowProps<T> = Pick<Parameters<typeof FilterList<T>>[0],
  "columns" | "rowHref" | "avatar" | "rowActions">;

function Row<T>(q: { p: RowProps<T>; r: T }) {
  const { p, r } = q;
  const mask = useMaskText();
  const href = p.rowHref?.(r);
  const who = p.avatar?.(r);
  const cells = p.columns.map((c, i) => i > 0 ? (
    <span key={c.key} className={s.cell} data-end={c.end === true}>
      <span className={s.cellLabel}>{c.label}</span>
      {maskNode(mask, c.render(r))}
    </span>
  ) : (
    <span key={c.key} className={s.cellMain} data-row-main="">
      {who !== undefined && <Avatar id={who.id} name={who.name} />}
      <span className={s.cellText}>{maskNode(mask, c.render(r))}</span>
    </span>
  ));
  const row = href === undefined ? <div className={s.row}>{cells}</div>
    : <a className={s.row} href={href} data-row=""
      aria-current={href === lastRecord() ? "true" : undefined}
      data-row-name={who?.name}>{cells}</a>;
  if (p.rowActions === undefined) return <li>{row}</li>;
  return (
    <li className={s.actRow}>
      {row}
      <span className={s.rowActs}>{p.rowActions(r)}</span>
    </li>
  );
}
