import { downloadText } from "../../lib/download";
import { toCsv } from "../../reports/csv";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { FilterList } from "../../ui/templates";
import type { AccessData } from "./data";
import { Status, type Tone } from "./ui";
import s from "./access.module.css";

const COLUMN: Record<string, string> = { number: "Employee number",
  email: "E-mail", department: "Department", leaving: "Leaving date",
  basic: "Basic salary", iban: "IBAN" };

/** S37: a file from the old system, checked row by row. */
export function Import(p: { d: AccessData }) {
  const { sample } = p.d;
  const toast = useToast();
  const tone = (st: string): Tone => st === "ready" ? "ok"
    : st === "warning" ? "warn" : "danger";
  const fixes = sample.rows.filter((r) => r.problems.length > 0);
  return (
    <div>
      <FilterList title="Data import" lede={`${sample.summaryText}`}
        rows={sample.rows} rowKey={(r) => String(r.line)}
        searchText={(r) => `${r.values.name} ${r.values.number}`}
        segments={[{ id: "all", label: "All", match: () => true },
          { id: "ready", label: "Ready", match: (r) => r.status === "ready" },
          { id: "warning", label: "To review",
            match: (r) => r.status === "warning" },
          { id: "error", label: "To fix",
            match: (r) => r.status === "error" }]}
        actions={(
          <>
            <button type="button" className={`${b.btn} ${b.secondary} ${s.tap}`}
              onClick={() => downloadText(sample.fileName, sample.text,
                "text/csv;charset=utf-8")}>Download the sample file</button>
            <button type="button" className={`${b.btn} ${b.primary} ${s.tap}`}
              onClick={() => toast.show(`Nothing imported. ${
                sample.summary.ready} ready rows would be added; ${
                sample.summary.errors} rows need a fix first.`)}>
              Import the ready rows</button>
          </>
        )}
        columns={[{ key: "n", label: "Person",
          render: (r) => `${r.values.name}` },
        { key: "l", label: "Line", render: (r) => `Line ${r.line}` },
        { key: "s", label: "Result", render: (r) => (
          <Status tone={tone(r.status)}>{r.statusText}</Status>) },
        { key: "w", label: "To look at", render: (r) => r.problems.length === 0
          ? "Nothing" : r.problems.map((x) => COLUMN[x.column] ?? x.column)
            .join(", ") }]}
        empty="No rows match." />
      <div className={s.below}>
        <h2 className={s.blockTitle}>What we found</h2>
        <ul className={s.panel}>
          {fixes.map((r) => (
            <li key={r.line} className={s.item}>
              <span className={s.itemMain}>
                <span>{r.values.name}, line {r.line}</span>
                {r.problems.map((x) => (
                  <small key={x.column} className={s.wrap}>
                    {x.severity === "error" ? "Fix: " : "Check: "}
                    {x.message} <span className={s.fix}>{x.fix}</span>
                  </small>
                ))}
              </span>
              <Status tone={tone(r.status)}>{r.statusText}</Status>
            </li>
          ))}
        </ul>
        <p className={s.note}>{sample.note}</p>
      </div>
    </div>
  );
}

interface Fact { id: string; topic: string; text: string;
  tone: Tone; download?: { name: string; body: () => string } }

/** S39: where data lives, what can be exported, what is not claimed. */
export function Location(p: { d: AccessData }) {
  const { d } = p;
  const L = d.location;
  const toast = useToast();
  const facts: Fact[] = [
    { id: "demo", topic: "This site", text: L.statements[0]!.text,
      tone: "none" },
    { id: "where", topic: "Where it runs", text: L.statements[1]!.text,
      tone: "none" },
    { id: "live", topic: "A live account", text: L.statements[2]!.text,
      tone: "none" },
    { id: "claims", topic: "What we do not claim",
      text: L.statements[3]!.text, tone: "none" },
    { id: "export-users", topic: "People with access",
      text: `${d.users.length} users and their roles, as a spreadsheet file.`,
      tone: "ok", download: { name: "people-with-access.csv",
        body: () => toCsv([["Name", "E-mail", "Job", "Role",
          "Second step", "Last sign-in"], ...d.usersCsvRows]) } },
    { id: "export-sample", topic: "Import sample",
      text: `The ${d.sample.rows.length}-row file the import screen checks.`,
      tone: "ok", download: { name: d.sample.fileName,
        body: () => d.sample.text } },
    { id: "backup", topic: "Backup", text: "Not part of the demo: nothing " +
      "is saved, and a reload starts the story again.", tone: "none" },
  ];
  return (
    <FilterList title="Data location and export"
      lede={`Demo only. Data region of this site: ${L.region}.`}
      rows={facts} rowKey={(f) => f.id}
      columns={[{ key: "t", label: "Topic", render: (f) => f.topic },
        { key: "x", label: "What we can say", render: (f) => (
          <span className={s.wrap}>{f.text}</span>) },
        { key: "a", label: "", end: true, render: (f) =>
          f.download === undefined ? null : (
            <button type="button" className={`${b.btn} ${b.secondary} ${s.tap}`}
              onClick={() => {
                downloadText(f.download!.name, f.download!.body(),
                  "text/csv;charset=utf-8");
                toast.show(`Downloaded ${f.download!.name}.`);
              }}>Download</button>) }]}
      empty="Nothing to show." />
  );
}
