import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { FilterList, RecordTabs } from "../../ui/templates";
import { trailOf, type EsignRow } from "../esign/model";
import { SignBlock, useEsign, useSigner, Word } from "../esign/Sign";
import s from "../esign/esign.module.css";
import { E } from "../esign/words";
import { Outside } from "../team/common";

const LIST = hrefOf("people", "files", "signatures");

/**
 * P35 and D5: the register of every paper that needs a signature, who
 * signs it and in which order. Each record carries the SignBlock and
 * its audit trail. A demo of the workflow; no legal validity claimed.
 */
export function Signatures(p: { rest: string[] }) {
  const { rows } = useEsign();
  const me = useSigner();
  if (p.rest[0] !== undefined) {
    const row = rows.find((r) => r.doc.id === p.rest[0]);
    return row === undefined ? <Outside /> : <SignRecord row={row} />;
  }
  return (
    <FilterList title={E.register} lede={E.registerLede} rows={rows}
      rowKey={(r) => r.doc.id}
      searchText={(r) => `${r.doc.title} ${r.doc.subjectName} ${
        r.doc.signers.map((x) => x.name).join(" ")}`}
      rowHref={(r) => hrefOf("people", "files", "signatures", r.doc.id)}
      segments={[
        { id: "wait", label: E.waiting, match: (r) =>
          r.progress.word === "Awaiting signature" },
        { id: "mine", label: E.hrHome, match: (r) =>
          r.progress.next?.personId === me.by },
        { id: "done", label: E.done, match: (r) =>
          r.progress.word === "Signed" },
        { id: "no", label: E.declined, match: (r) =>
          r.progress.word === "Declined" },
        { id: "all", label: E.all, match: () => true },
      ]}
      columns={[
        { key: "d", label: E.paper, render: (r) => (
          <span className={s.section}><span>{r.doc.title}</span>
            <small className={s.muted}>{r.doc.subjectName}</small></span>) },
        { key: "s", label: E.signers, render: (r) => (
          <span className={s.muted}>{r.doc.signers.map((x) =>
            `${x.order}. ${x.name}`).join(", ")}</span>) },
        { key: "t", label: E.status, render: (r) => (
          <span className={s.section}><Word word={r.progress.word} />
            {r.progress.next !== null && (
              <small className={s.muted}>{r.progress.next.personId === me.by
                ? E.yourTurn : E.turnOf(r.progress.next.name)}</small>)}
          </span>) },
      ]}
      empty={E.nothing} />
  );
}

function SignRecord(p: { row: EsignRow }) {
  const { data, state } = useDemo();
  const { row } = p;
  const trail = trailOf(data, state, row);
  return (
    <RecordTabs title={row.doc.title} lede={row.doc.subjectName}
      back={{ label: E.register, href: LIST }}
      stats={[{ label: E.status, value: row.progress.word },
        { label: E.signers, value: String(row.doc.signers.length) },
        { label: E.about, value: row.doc.subjectName }]}
      tabs={[
        { id: "sign", label: "Signing", render: () => (
          <div className={s.page}>
            <p className={s.note}>{data.esign.note}</p>
            <SignBlock docId={row.doc.id} heading={false} />
          </div>) },
        { id: "doc", label: E.preview, render: () => (
          <pre className={s.preview} tabIndex={0}
            aria-label={row.doc.title}>{row.doc.lines.join("\n")}</pre>) },
        { id: "trail", label: E.trail, render: () => trail.length === 0
          ? <p className={s.note}>{E.trailEmpty}</p> : (
            <ol className={s.trail}>
              {trail.map((x) => (
                <li key={x.key}><strong>{x.what}</strong>: {x.who}
                  <span className={s.muted}> · {x.when}</span></li>))}
            </ol>) },
      ]} />
  );
}
