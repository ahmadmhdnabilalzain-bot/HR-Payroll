import { useState } from "react";
import b from "../../ui/button.module.css";
import type { SetupErpSource } from "./source";
import s from "./erp.module.css";

/** A table in a keyboard-reachable scroll area (phones scroll it). */
function Table(p: { label: string; head: string[]; ends?: number[];
  rows: string[][]; foot?: string[] }) {
  const end = (i: number) => p.ends?.includes(i) === true ? "true" : undefined;
  return (
    <div className={s.scroll} role="region" aria-label={p.label}
      tabIndex={0}>
      <table className={s.table}>
        <thead><tr>{p.head.map((h, i) => (
          <th key={h} scope="col" data-end={end(i)}>{h}</th>))}</tr></thead>
        <tbody>{p.rows.map((r, i) => (
          <tr key={i}>{r.map((v, j) => (
            <td key={j} data-end={end(j)}>{v}</td>))}</tr>))}</tbody>
        {p.foot !== undefined && (
          <tfoot><tr>{p.foot.map((v, j) => (
            <td key={j} data-end={end(j)}>{v}</td>))}</tr></tfoot>)}
      </table>
    </div>
  );
}

function Block(p: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className={s.block}>
      <h2 className={s.title}>{p.title}</h2>
      {p.hint !== undefined && <p className={s.hint}>{p.hint}</p>}
      {p.children}
    </section>
  );
}

/** What the ERP would receive: staff records and the account mapping. */
export function ErpPreview(p: { src: SetupErpSource }) {
  const { src } = p;
  return (
    <>
      <Block title="Staff records it would send"
        hint="The first five of the sample staff. No pay, no ID numbers.">
        <Table label="Employee sync preview"
          head={["Number", "Name", "Department", "Cost centre", "Joined"]}
          rows={src.sync.map((r) => [r.number, r.name, r.department,
            r.costCentre, r.joined])} />
      </Block>
      <Block title="Departments to cost centres"
        hint="Sample cost centres, one for each department.">
        <Table label="Cost centres" head={["Department", "Cost centre"]}
          rows={src.centres.map((x) => [x.department, x.code])} />
      </Block>
      <Block title="Pay elements to accounts"
        hint="Sample accounts. Your accountant sets the real ones.">
        <Table label="Account mapping"
          head={["Pay line", "Kind", "Account", "Account name"]}
          rows={src.mapping.map((m) => [m.source, m.kind, m.code,
            m.account])} />
      </Block>
    </>
  );
}

/** The posting preview, its totals, and a download of the file. */
export function PostingPreviewBlock(p: { src: SetupErpSource }) {
  const { posting } = p.src;
  const download = (): void => {
    const url = URL.createObjectURL(new Blob([p.src.csv],
      { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = posting.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Block title={`Posting preview, ${posting.period}`}
      hint={posting.note}>
      <Table label="Posting preview"
        head={["Account", "Name", "Cost centre", "Debit", "Credit"]}
        ends={[3, 4]}
        rows={posting.lines.map((l) => [l.account, l.accountName,
          l.costCentre, l.cells[6] ?? "", l.cells[7] ?? ""])}
        foot={["Total", posting.display.lines, "",
          posting.display.debits, posting.display.credits]} />
      <div className={s.actions}>
        <button type="button" className={`${b.btn} ${b.secondary}`}
          onClick={download}>Download {posting.fileName}</button>
        <span className={s.result}>{posting.balanced
          ? "Debits and credits are equal." : "Debits and credits differ."}
        </span>
      </div>
    </Block>
  );
}

/** The Teams card a waiting request would send. */
export function TeamsPreview(p: { src: SetupErpSource }) {
  return (
    <Block title="Cards it would send"
      hint="One card for each request waiting. Shown here, not sent.">
      {p.src.cards.map((c) => (
        <article key={c.id} className={s.card} aria-label={c.title}>
          <strong>{c.title}</strong>
          {c.amount !== null && <span>{c.amount}</span>}
          <small>{c.detail}</small>
          <div className={s.buttons}>{c.buttons.map((x) => (
            <span key={x} className={s.fake}>{x}</span>))}</div>
        </article>
      ))}
    </Block>
  );
}

/** A test of the connection: the demo says it cannot. */
export function TestConnection(p: { result: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div className={s.actions}>
      <button type="button" className={`${b.btn} ${b.quiet} ${s.tap}`}
        onClick={() => setShown(true)}>Test connection</button>
      <span className={s.result} role="status">{shown ? p.result : ""}</span>
    </div>
  );
}
