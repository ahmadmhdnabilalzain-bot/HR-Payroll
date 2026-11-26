import type { ReactNode } from "react";
import { Explainable } from "../../components/explain/Explain";
import type { Explanation } from "../../components/explain/types";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../button.module.css";
import { PageHead } from "./PageHead";
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
 * A figure or a cell with an explanation becomes its own trigger (the
 * dotted rule), and the page's one note then says so once.
 */
export function ReportPage(p: {
  title: string;
  period: string;
  figure?: { label: string; value: ReactNode;
    explanation?: Explanation | undefined };
  columns: ReportColumn[];
  rows: string[][];
  /** The working behind a cell, by row and column, if it has one. */
  explain?: (row: number, col: number) => Explanation | undefined;
  bars?: number[];
  note?: string;
  csvName: string;
}) {
  const { t } = useLocale();
  const hinted = p.figure?.explanation !== undefined ||
    p.explain !== undefined;
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
      <PageHead title={p.title} lede={p.period} actions={(
        <>
          <button type="button" className={`${b.btn} ${b.secondary}`}
            onClick={download}>{t("tpl.csv")}</button>
          <button type="button" className={`${b.btn} ${b.quiet}`}
            onClick={() => print()}>{t("tpl.print")}</button>
        </>
      )} />
      {p.figure !== undefined && (
        <div className={s.figure}>
          <span>{p.figure.label}</span>
          <strong>
            {p.figure.explanation === undefined ? p.figure.value : (
              <Explainable explanation={p.figure.explanation}>
                {p.figure.value}
              </Explainable>)}
          </strong>
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
                  <Cell e={p.explain?.(i, j)}>{v}</Cell>
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
      {(p.note !== undefined || hinted) && (
        <p className={s.note}>
          {[p.note, hinted ? t("tpl.explainHint") : undefined]
            .filter((x) => x !== undefined).join(" ")}
        </p>
      )}
    </div>
  );
}

function Cell(p: { e: Explanation | undefined; children: string }) {
  return p.e === undefined ? <>{p.children}</>
    : <Explainable explanation={p.e}>{p.children}</Explainable>;
}
