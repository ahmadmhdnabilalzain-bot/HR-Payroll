import type { ReactNode } from "react";
import { useDemo } from "../../demo/state";
import { formatNumber } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import { toCsv as csvOf, type Cell } from "../../lib/csv";
import { downloadText } from "../../lib/download";
import { Money } from "../Money";
import { MoreMenu } from "./Menu";
import { PageFoot } from "./PageFoot";
import { PageHead, type Crumb } from "./PageHead";
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
  if (typeof p.c === "number") {
    return <span className="tabular">{formatNumber(p.c, lang)}</span>;
  }
  if (typeof p.c === "string") {
    return p.c === "" || p.c === "-"
      ? <span className={s.none}>{"–"}</span> : <>{p.c}</>;
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
 */
export function ReportPage(p: {
  title: string;
  period: string;
  figure?: { label: string; value: ReactNode };
  chart?: ReactNode;
  columns: ReportColumn[];
  rows: Cell[][];
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
}) {
  const { t } = useLocale();
  const { state } = useDemo();
  const money = [...p.rows, p.total ?? []].some((r) => r.some(isMoney));
  const hidden = state.hideAmounts && money;
  const download = (): void => downloadText(p.csvName,
    toCsv(p.columns, p.total === undefined ? p.rows
      : [...p.rows, p.total]), "text/csv;charset=utf-8");
  const end = (j: number): boolean => p.columns[j]?.end === true;
  return (
    <article className={`${s.page} ${s.report}`}
      aria-labelledby={p.id ?? "report-title"}>
      <PageHead id={p.id ?? "report-title"} title={p.title}
        lede={p.period} meta={p.meta} crumbs={p.crumbs} actions={(
          <MoreMenu items={[{ label: t("tpl.csv"), onSelect: download,
            disabled: hidden, hint: t("tpl.hiddenCsv") },
          { label: t("tpl.print"), onSelect: () => print() }]} />
        )} />
      {p.figure !== undefined && (
        <div className={s.figure}>
          <span>{p.figure.label}</span>
          <strong>{p.figure.value}</strong>
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
                  <CellView c={v} />
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
                  <CellView c={v} />
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
      {p.note !== undefined && <p className={s.note}>{p.note}</p>}
      <PageFoot extra={p.foot} />
    </article>
  );
}
