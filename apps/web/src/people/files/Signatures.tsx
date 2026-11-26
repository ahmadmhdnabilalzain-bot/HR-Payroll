import { useState } from "react";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import b from "../../ui/button.module.css";
import { useToast } from "../../ui/Toast";
import { FilterList, KeyValues, RecordTabs } from "../../ui/templates";
import t from "../../ui/templates/templates.module.css";
import { stepBy } from "../papers/model";
import { Outside, Status } from "../team/common";
import { Field, useActor, useNames } from "./common";
import f from "./files.module.css";
import { signRows, type SignNow, type SignRow } from "./signing";
import { S } from "./words";

const LIST = hrefOf("people", "files", "signatures");
const WORD: Record<SignNow, [string, "ok" | "warn" | "open" | "plain"]> = {
  "not-requested": [S.notAsked, "plain"], waiting: [S.waiting, "warn"],
  signed: [S.signed, "ok"], closed: [S.closed, "plain"] };

/** P35: signature requests on letters and offers (a demo of the steps). */
export function Signatures(p: { rest: string[] }) {
  const { data, state } = useDemo();
  const rows = signRows(data, state);
  if (p.rest[0] !== undefined) {
    const row = rows.find((r) => r.id === p.rest[0]);
    return row === undefined ? <Outside /> : <SignRecord row={row} />;
  }
  return (
    <FilterList title={S.title} lede={S.lede} rows={rows}
      rowKey={(r) => r.id} searchText={(r) => `${r.title} ${r.personName}`}
      rowHref={(r) => hrefOf("people", "files", "signatures", r.id)}
      segments={[
        { id: "to", label: S.toSign, match: (r) => r.now === "waiting" },
        { id: "done", label: S.signed, match: (r) => r.now === "signed" },
        { id: "all", label: S.all, match: () => true },
      ]}
      columns={[
        { key: "d", label: S.paper, render: (r) => (
          <span className={f.stack}><span>{r.title}</span>
            <small>{r.personName}</small></span>) },
        { key: "s", label: S.signer, render: (r) => (
          <span className={f.stack}><span>{r.signerName}</span>
            <small>{r.signerRole}</small></span>) },
        { key: "t", label: S.status, render: (r) => {
          const [word, tone] = WORD[r.now];
          return <Status tone={tone}>{word}</Status>;
        } },
      ]}
      empty={S.empty} />
  );
}

function SignRecord(p: { row: SignRow }) {
  const { data, state, dispatch } = useDemo();
  const names = useNames();
  const me = useActor();
  const toast = useToast();
  const { row } = p;
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [word, tone] = WORD[row.now];
  const mine = row.kind === "letter" ? state.role === "gm"
    : state.role === "hr";
  const doSign = (): void => {
    if (typed.trim().toLowerCase() !== row.signerName.toLowerCase()) {
      setError(S.mismatch(row.signerName));
      return;
    }
    setError(null);
    dispatch({ type: "files", op: { op: "sign", docId: row.id,
      step: { ...me.who, typed: typed.trim() } } });
    if (row.kind === "letter") {
      dispatch({ type: "paper-step", id: row.sourceId,
        step: stepBy(data, state, "issued") });
    } else {
      dispatch({ type: "move-step", key: `offer:${row.sourceId}`,
        step: { value: "accepted", from: "sent", by: me.id,
          role: me.role, on: me.on } });
    }
    toast.show(S.done, () => undo());
  };
  const undo = (): void => {
    dispatch({ type: "files", op: { op: "unsign", docId: row.id } });
    if (row.kind === "letter") {
      dispatch({ type: "paper-undo", id: row.sourceId });
    } else dispatch({ type: "move-undo", key: `offer:${row.sourceId}` });
  };
  const ask = (): void => {
    dispatch({ type: "files", op: { op: "sign-ask", docId: row.id,
      who: me.who } });
    dispatch({ type: "paper-step", id: row.sourceId,
      step: stepBy(data, state, "pending") });
    toast.show(S.asked, () => {
      dispatch({ type: "files", op: { op: "sign-unask", docId: row.id } });
      dispatch({ type: "paper-undo", id: row.sourceId });
    });
  };
  const canAsk = row.now === "not-requested" && row.kind === "letter" &&
    state.role === "hr";
  return (
    <RecordTabs title={row.title} lede={row.personName}
      back={{ label: S.title, href: LIST }}
      stats={[{ label: S.status, value: word },
        { label: S.signer, value: row.signerName },
        { label: S.role, value: row.signerRole }]}
      actions={canAsk ? (
        <button type="button" className={`${b.btn} ${b.primary}`}
          onClick={ask}>{S.ask}</button>) : undefined}
      tabs={[
        { id: "sign", label: S.signing, render: () => (
          <div className={f.panel}>
            <p className={f.hint}>{data.files.sign.note}</p>
            {row.now === "signed" ? (
              <>
                <p className={f.sign}>{row.typed !== undefined
                  ? S.signedLine(row.typed.typed, names.by(row.typed.by,
                    row.typed.on)) : S.signedBefore}</p>
                {row.typed !== undefined && (
                  <div>
                    <button type="button"
                      className={`${b.btn} ${b.secondary}`}
                      onClick={undo}>{S.undo}</button>
                  </div>)}
              </>
            ) : row.now === "waiting" ? (mine ? (
              <form className={t.form} onSubmit={(e) => {
                e.preventDefault(); doSign(); }}>
                {row.kind === "offer" && (
                  <p className={f.hint}>{S.offerNote}</p>)}
                <Field label={S.typeName(row.signerName)} help={S.typeHelp}>
                  <input value={typed} autoComplete="off"
                    onChange={(e) => { setTyped(e.target.value);
                      setError(null); }} />
                </Field>
                {error !== null && <p className={t.error} role="alert">
                  {error}</p>}
                <div className={t.formActions}>
                  <button type="submit" className={`${b.btn} ${b.primary}`}>
                    {S.sign}</button>
                </div>
              </form>
            ) : (
              <p className={f.hint}>{row.kind === "letter" ? S.onlyGm
                : S.onlyHrOffer}</p>
            )) : row.now === "closed" ? (
              <p className={f.hint}>{S.closedLine}</p>
            ) : (
              <p className={f.hint}>{row.kind === "letter" ? S.askFirst
                : S.sendFirst}</p>
            )}
          </div>) },
        { id: "details", label: S.details, render: () => (
          <KeyValues items={[
            { label: S.paper, value: row.title },
            { label: S.about, value: row.personName },
            { label: S.status, value: <Status tone={tone}>{word}</Status> },
            ...(row.asked !== undefined ? [{ label: S.askedBy,
              value: names.by(row.asked.by, row.asked.on) }] : []),
          ]} />) },
      ]} />
  );
}
