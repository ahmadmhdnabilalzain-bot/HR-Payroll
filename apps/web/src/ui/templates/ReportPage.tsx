import type { ReactNode } from "react";
import { useLocale } from "../../i18n/LocaleProvider";
import { MoreMenu } from "./Menu";
import { PageHead, type Crumb } from "./PageHead";
import s from "./templates.module.css";

export interface ReportColumn {
  label: string;
  end?: boolean;
}

/** A CSV a spreadsheet opens: quoted, formula-safe, BOM for Excel. */
export function toCsv(columns: ReportColumn[], rows: string[][]): string {
  const cell = (v: string): string => {
    const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return "﻿" + [columns.map((c) => c.label), ...rows]
    .map((r) => r.map(cell).join(",")).join("\r\n");
}

/**
 * RP, report: title, period, one figure, one table (with optional bars
 * in per mille of the largest), CSV download and print. Cells are text
 * already formatted by the builder (money through formatMoney).
 */
export function ReportPage(p: {
  title: string;
  period: string;
  figure?: { label: string; value: ReactNode };
  columns: ReportColumn[];
  rows: string[][];
  bars?: number[];
  note?: string;
  csvName: string;
  /** A line under the period (a month stepper). */
  meta?: ReactNode;
  crumbs?: Crumb[];
}) {
  const { t } = useLocale();
  const download = (): void => {
    const url = URL.createObjectURL(new Blob([toCsv(p.columns, p.rows)],
      { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = p.csvName;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className={s.page}>
      <PageHead title={p.title} lede={p.period} meta={p.meta}
        crumbs={p.crumbs} actions={(
          <MoreMenu items={[{ label: t("tpl.csv"), onSelect: download },
            { label: t("tpl.print"), onSelect: () => print() }]} />
        )} />
      {p.figure !== undefined && (
        <div className={s.figure}>
          <span>{p.figure.label}</span>
          <strong>{p.figure.value}</strong>
        </div>
      )}
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
                <td key={j} data-end={p.columns[j]?.end === true}
                  data-label={p.columns[j]?.label}>
                  {v}
                  {j === 0 && p.bars?.[i] !== undefined && (
                    <span className={s.bar} aria-hidden="true"
                      style={{ inlineSize: `${(p.bars[i] ?? 0) / 10}%` }} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {p.note !== undefined && <p className={s.note}>{p.note}</p>}
    </div>
  );
}
