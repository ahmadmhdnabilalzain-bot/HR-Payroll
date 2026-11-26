import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Explainable } from "../../components/explain/Explain";
import type { Explanation } from "../../components/explain/types";
import { useDemo } from "../../demo/state";
import { formatNumber } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import { toCsv as csvOf, type Cell } from "../../lib/csv";
import { downloadText } from "../../lib/download";
import { amountsHidden, maskMoney, useMaskText } from "../mask";
import { Money } from "../Money";
import { dur, easeOut, reduced, useEntrance, useReveal, veil }
  from "./listEnter";
import { MoreMenu } from "./Menu";
import { PageFoot } from "./PageFoot";
import { PageHead, type Crumb } from "./PageHead";
import "./motion.module.css";
import s from "./templates.module.css";

export type { Cell } from "../../lib/csv";

export interface ReportColumn {
  label: string;
  end?: boolean;
}

/** A CSV a spreadsheet opens: formula-safe, plain numbers, a BOM. */
export function toCsv(columns: ReportColumn[], rows: Cell[][]): string {
  return csvOf([columns.map((c) => c.label), ...rows]);
}

const isMoney = (c: Cell): c is Exclude<Cell, string | number> =>
  typeof c === "object";

/** One cell on screen: money through <Money/>, the rest as text. */
export function CellView(p: { c: Cell }) {
  const { lang } = useLocale();
  const mask = useMaskText();
  if (typeof p.c === "number") {
    return <span className="tabular">{formatNumber(p.c, lang)}</span>;
  }
  if (typeof p.c === "string") {
    return p.c === "" || p.c === "-"
      ? <span className={s.none}>{"–"}</span> : <>{mask(p.c)}</>;
  }
  return <Money value={p.c.fils} size="sm" tween={false}
    signed={p.c.signed === true} />;
}

/**
 * RP, report: one head (crumbs, title, period, a "..." menu with the
 * CSV and Print), a 48/52 figure, an optional chart (BarChart,
 * Waterfall), then the table: money cells are amounts in fils (so
 * they follow hide-amounts and go to the CSV as plain numbers), right
 * aligned and tabular, and an optional bold total row. Optional bars
 * under the first cell (per mille of the largest). The CSV is off
 * while amounts are hidden. One quiet sources line closes the page.
 * A figure or a cell with an explanation becomes its own trigger (the
 * dotted rule), and the page's one note then says so once.
 */
export function ReportPage(p: {
  title: string;
  period: string;
  figure?: { label: string; value: ReactNode;
    explanation?: Explanation | undefined;
    /** What the figure is of (a month): when it changes, the label
     * and the figure change together in one frame and come in under
     * a short veil (pass the figure's Money with tween false). */
    swap?: string };
  chart?: ReactNode;
  columns: ReportColumn[];
  rows: Cell[][];
  /** The working behind a cell, by row and column, if it has one; the
   * total row is row `rows.length`. */
  explain?: ((row: number, col: number) => Explanation | undefined)
    | undefined;
  /** The sum or the change, set bold under a 2px rule. */
  total?: Cell[];
  bars?: number[] | undefined;
  note?: string | undefined;
  csvName: string;
  /** A line under the period (a month stepper). */
  meta?: ReactNode;
  crumbs?: Crumb[];
  /** Under the table, before the sources line (a count, a scope). */
  foot?: string;
  id?: string;
  /** One more action before the menu (e.g. run a check). */
  actions?: ReactNode;
}) {
  const { t } = useLocale();
  const { state } = useDemo();
  const masked = amountsHidden(state);
  const money = [...p.rows, p.total ?? []].some((r) => r.some(isMoney));
  const hidden = masked && money;
  // Amounts written inside text cells are masked in the file too.
  const text = (r: Cell[]): Cell[] => masked ? r.map((c) =>
    typeof c === "string" ? maskMoney(c) : c) : r;
  const download = (): void => downloadText(p.csvName,
    toCsv(p.columns, (p.total === undefined ? p.rows
      : [...p.rows, p.total]).map(text)), "text/csv;charset=utf-8");
  const end = (j: number): boolean => p.columns[j]?.end === true;
  const hinted = p.figure?.explanation !== undefined ||
    p.explain !== undefined;
  const note = [p.note, hinted ? t("tpl.explainHint") : undefined]
    .filter((x) => x !== undefined).join(" ");
  // Rows in view rise in once; sections below the fold rise in as
  // they scroll into view (listEnter.ts).
  const page = useRef<HTMLElement>(null);
  useEntrance(page, ":scope > table > tbody > tr", { scope: "report" });
  useReveal(page, ":scope > :not(header), [data-reveal-part]");
  const fig = useRef<HTMLDivElement>(null);
  const swap = p.figure?.swap;
  const swapWas = useRef(swap);
  // Render phase, on a swap: where each section is drawn now, so the
  // ones under a chart that grows or shrinks glide to their new place.
  const tops = useRef<number[] | null>(null);
  if (swapWas.current !== swap && page.current !== null) {
    tops.current = [...page.current.children].map((c) =>
      c.getBoundingClientRect().top);
  }
  useLayoutEffect(() => {
    if (swapWas.current === swap) return;
    swapWas.current = swap;
    const was = tops.current;
    tops.current = null;
    if (fig.current === null || page.current === null || reduced()) return;
    veil(fig.current, { duration: dur("--dur-fast"), easing: easeOut() });
    const root = getComputedStyle(document.documentElement);
    const z = Number(root.getPropertyValue("zoom")) || 1;
    const inOut = root.getPropertyValue("--ease-in-out").trim() ||
      "cubic-bezier(0.4, 0, 0.2, 1)";
    [...page.current.children].forEach((c, i) => {
      const dy = ((was?.[i] ?? 0) - c.getBoundingClientRect().top) / z;
      if (was === null || Math.abs(dy) < 0.5) return;
      c.animate([{ transform: `translateY(${dy}px)` },
        { transform: "none" }],
      { duration: dur("--dur-slow"), easing: inOut });
    });
  }, [swap]);
  return (
    <article className={`${s.page} ${s.report}`} ref={page}
      aria-labelledby={p.id ?? "report-title"} data-record-head="">
      <PageHead id={p.id ?? "report-title"} title={p.title}
        lede={p.period} meta={p.meta} crumbs={p.crumbs} actions={(
          <>{p.actions}<MoreMenu items={[{ label: t("tpl.csv"),
            onSelect: download, disabled: hidden,
            hint: t("tpl.hiddenCsv") },
          { label: t("tpl.print"), onSelect: () => print() }]} /></>
        )} />
      {p.figure !== undefined && (
        <div className={s.figure} ref={fig}>
          <span>{p.figure.label}</span>
          <strong>
            {p.figure.explanation === undefined ? p.figure.value : (
              <Explainable explanation={p.figure.explanation}>
                {p.figure.value}
              </Explainable>)}
          </strong>
        </div>
      )}
      {p.chart}
      <table className={s.table}>
        <thead>
          <tr>{p.columns.map((c) => (
            <th key={c.label} scope="col" data-end={c.end === true}>
              {c.label}</th>
          ))}</tr>
        </thead>
        <tbody>
          {p.rows.map((r, i) => (
            <tr key={i}>
              {r.map((v, j) => (
                <td key={j} data-end={end(j)}
                  data-label={p.columns[j]?.label}>
                  <Why e={p.explain?.(i, j)}><CellView c={v} /></Why>
                  {j === 0 && p.bars?.[i] !== undefined && (
                    <span className={s.bar} aria-hidden="true">
                      <span className={s.fill} style={{ transform:
                        `scaleX(${(p.bars[i] ?? 0) / 1000})` }} />
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {p.total !== undefined && (
          <tfoot>
            <tr className={s.totalRow}>
              {p.total.map((v, j) => (
                <td key={j} data-end={end(j)}
                  data-label={p.columns[j]?.label}>
                  <Why e={p.explain?.(p.rows.length, j)}>
                    <CellView c={v} /></Why>
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
      {note !== "" && (
        <p className={s.note}>{masked ? maskMoney(note) : note}</p>)}
      <PageFoot extra={p.foot} />
    </article>
  );
}

/** A cell with a working behind it is its own trigger. */
function Why(p: { e: Explanation | undefined; children: ReactNode }) {
  return p.e === undefined ? <>{p.children}</>
    : <Explainable explanation={p.e}>{p.children}</Explainable>;
}
