import { fils } from "@payroll/engine";
import type { DemoData } from "../demo/data/types";
import type { RunDetail } from "../demo/data/run-types";
import { formatDate, formatMonth } from "../i18n/format";
import type { MessageKey, T } from "../i18n/t";
import type { Lang } from "../i18n/types";
import type { Cell } from "./csv";

export type ReportId = "summary" | "departments" | "nationality" |
  "documents" | "files";

export const REPORTS: readonly ReportId[] = ["summary", "departments",
  "nationality", "documents", "files"];

export const TITLE: Record<ReportId, MessageKey> = {
  summary: "reports.summaryTitle", departments: "reports.deptTitle",
  nationality: "reports.natTitle", documents: "reports.docTitle",
  files: "reports.filesTitle",
};

export const BLURB: Record<ReportId, MessageKey> = {
  summary: "reports.summaryBlurb", departments: "reports.deptBlurb",
  nationality: "reports.natBlurb", documents: "reports.docBlurb",
  files: "reports.filesBlurb",
};

export interface Column { label: string; end: boolean }

/** One report as a table: what the page shows and the CSV holds. */
export interface Table {
  columns: Column[];
  rows: Cell[][];
  /** Optional bars, per mille of the largest, one per row. */
  bars?: number[];
  /** A line said with the table (a label it must carry). */
  note?: string;
}

export interface Env {
  d: RunDetail;
  data: DemoData;
  lang: Lang;
  t: T;
  approved: boolean;
}

const perMille = (xs: bigint[]): number[] => {
  const max = xs.reduce((m, x) => x > m ? x : m, 0n);
  return xs.map((x) => max === 0n ? 0 : Number((x * 1000n) / max));
};

function summary(e: Env): Table {
  const { d, t, lang } = e;
  const prev = formatMonth(d.prevMonth, lang);
  const now = formatMonth(d.month, lang);
  const row = (label: string, a: bigint, b: bigint): Cell[] =>
    [label, { fils: fils(a) }, { fils: fils(b) }, { fils: fils(a - b) }];
  return {
    columns: [{ label: t("reports.colItem"), end: false },
      { label: now, end: true }, { label: prev, end: true },
      { label: t("reports.colChange"), end: true }],
    rows: [
      row(t("payrun.gross"), d.totals.gross, d.prev.gross),
      row(t("payrun.deductions"), d.totals.deductions, d.prev.deductions),
      row(t("payrun.net"), d.totals.net, d.prev.net),
      [t("payrun.people"), d.totals.headcount, d.prev.headcount,
        d.totals.headcount - d.prev.headcount],
      [t("reports.inFile"), { fils: d.file.total }, "", ""],
      [t("reports.peopleInFile"), d.file.people, "", ""],
    ],
    note: t("reports.summaryNote"),
  };
}

function departments(e: Env): Table {
  const rows = [...e.data.departments()].sort((a, b) =>
    a.costFils < b.costFils ? 1 : a.costFils > b.costFils ? -1 : 0);
  const total = rows.reduce((n, r) => n + r.costFils, 0n);
  return {
    columns: [{ label: e.t("reports.colDept"), end: false },
      { label: e.t("reports.colPeople"), end: true },
      { label: e.t("reports.colCost"), end: true },
      { label: e.t("reports.colShare"), end: true }],
    rows: rows.map((r) => [r.name[e.lang], r.headcount,
      { fils: r.costFils }, total === 0n ? "0%"
        : `${(Number((r.costFils * 1000n) / total) / 10).toFixed(1)}%`]),
    bars: perMille(rows.map((r) => r.costFils)),
    note: e.t("reports.deptNote"),
  };
}

function nationality(e: Env): Table {
  const n = e.d.nationalities;
  return {
    columns: [{ label: e.t("reports.colNationality"), end: false },
      { label: e.t("reports.colPeople"), end: true }],
    rows: [...n.rows.map((r) => [r.name, r.count] as Cell[]),
      [e.t("reports.total"), n.total]],
    bars: [...perMille(n.rows.map((r) => BigInt(r.count))), 0],
    note: e.t("reports.natNote", { date: formatDate(n.asOf, e.lang) }),
  };
}

function documents(e: Env): Table {
  const status = (days: number): string => days < 0
    ? e.t("reports.expired") : days <= 30 ? e.t("reports.within30")
      : days <= 90 ? e.t("reports.within90") : e.t("reports.valid");
  return {
    columns: [{ label: e.t("reports.colEmployee"), end: false },
      { label: e.t("reports.colDocument"), end: false },
      { label: e.t("reports.colExpires"), end: false },
      { label: e.t("reports.colDaysLeft"), end: true },
      { label: e.t("reports.colStatus"), end: false }],
    rows: e.data.documents().map((x) => [
      e.data.employee(x.employeeId).name[e.lang], x.kind[e.lang],
      formatDate(x.expiresOn, e.lang), x.daysLeft, status(x.daysLeft)]),
    note: e.t("reports.docNote"),
  };
}

function files(e: Env): Table {
  return {
    columns: [{ label: e.t("reports.colFile"), end: false },
      { label: e.t("reports.colMonth"), end: false },
      { label: e.t("reports.colPeople"), end: true },
      { label: e.t("reports.colTotal"), end: true },
      { label: e.t("reports.colDated"), end: false },
      { label: e.t("reports.colStatus"), end: false }],
    rows: e.d.register.map((r) => [r.fileName,
      formatMonth(r.month, e.lang), r.people, { fils: r.total },
      formatDate(r.dated, e.lang), e.approved ? e.t("reports.fileReady")
        : e.t("reports.fileDraft")]),
    note: e.t("reports.filesNote"),
  };
}

export const BUILD: Record<ReportId, (e: Env) => Table> = {
  summary, departments, nationality, documents, files,
};
