import { fils } from "@payroll/engine";
import { useState } from "react";
import { useRunApproval } from "../../demo/actions";
import { useDemo } from "../../demo/state";
import { useRunDetail } from "../../demo/useRunDetail";
import { formatDate, formatMonth, formatNumber } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import { Money } from "../../ui/Money";
import { ReportPage, type Cell } from "../../ui/templates";
import { useReportCrumbs } from "../fmt";
import { ReportEmpty, ReportFilter } from "../ReportFilter";

type Show = "all" | "ready" | "waiting";

/**
 * Salary file register: every salary file made for the bank, from
 * the run's own file (the same one the pay run downloads). A filter
 * by where each file stands; an empty filter says so in words.
 */
export function Files() {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const d = useRunDetail();
  const ready = useRunApproval().phase === "file";
  const crumbs = useReportCrumbs();
  const [show, setShow] = useState<Show>("all");
  const all = d.register.map((r) => ({ r, ready }));
  const rows = all.filter((x) => show === "all" ||
    (show === "ready") === x.ready);
  const held = d.register.reduce((n, r) => n + r.heldOut, 0);
  const total = fils(d.register.reduce((n, r) => n + r.total, 0n));
  const company = data.companyName.en.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const cells: Cell[][] = rows.map(({ r, ready: ok }) => [r.fileName,
    formatMonth(r.month, lang), r.people, { fils: r.total },
    r.heldOut, formatDate(r.dated, lang), ok ? t("reports.fileReady")
      : t("reports.fileDraft")]);
  const count = (k: Show): number => all.filter((x) => k === "all" ||
    (k === "ready") === x.ready).length;
  return (
    <ReportPage crumbs={crumbs} title={t("reports.filesTitle")}
      period={"Every salary file made for the bank: who is in it, the " +
        "amount, the date and where it stands."}
      figure={{ label: "Total in the salary files",
        value: <Money value={total} tween={false} /> }}
      meta={(
        <ReportFilter<Show> label="Show files" value={show} onChange={setShow}
          shown={rows.length} total={all.length} options={[
            { id: "all", label: "All", count: count("all") },
            { id: "ready", label: "Ready to upload",
              count: count("ready") },
            { id: "waiting", label: "Waiting for sign-off",
              count: count("waiting") }]} />
      )}
      chart={rows.length > 0 ? undefined : (
        <ReportEmpty text={show === "ready"
          ? "No file is ready to upload yet. The file is ready once " +
            "the pay run is signed off."
          : "No file is waiting for sign-off: every file is signed " +
            "off."} />
      )}
      columns={[{ label: t("reports.colFile") },
        { label: t("reports.colMonth") },
        { label: t("reports.colPeople"), end: true },
        { label: t("reports.colTotal"), end: true },
        { label: "Held out", end: true },
        { label: t("reports.colDated") },
        { label: t("reports.colStatus") }]}
      rows={cells}
      note={`${t("reports.filesNote")}${held === 0 ? "" : ` ${formatNumber(
        held, lang)} people are held out of the file; the pay run ` +
        "says why."}`}
      csvName={`${company}-files-${d.month}.csv`} />
  );
}
