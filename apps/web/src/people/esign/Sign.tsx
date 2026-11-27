import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import type { EsignMark, EsignSigner } from "../../demo/data/esign-types";
import { undoable } from "../../demo/esign-state";
import { hrefOf } from "../../demo/route";
import { useDemo, type Role } from "../../demo/state";
import b from "../../ui/button.module.css";
import { reducedMotion } from "../../demo/motion";
import { useHeightTween } from "../../ui/heightTween";
import {
  justSigned,
  markSigned,
  SignStamp,
  signSequence,
  STAMP_MS,
} from "../../ui/SignStamp";
import { Sheet, type RecordTab } from "../../ui/templates";
import t from "../../ui/templates/templates.module.css";
import { usePresence } from "../../ui/presence";
import { useToast } from "../../ui/Toast";
import { stepBy } from "../papers/model";
import {
  actorOf,
  esignRows,
  esignWorld,
  fingerprintOf,
  groupHex,
  lastReminder,
  ackKey,
  undoSteps,
  type EsignRow,
} from "./model";
import { PackLine } from "./PackLine";
import s from "./esign.module.css";
import { E } from "./words";

/** The signing world and its rows, worked out once per state. */
export function useEsign() {
  const { data, state } = useDemo();
  return useMemo(() => {
    const world = esignWorld(data, state);
    return { world, rows: esignRows(data, state, world) };
  }, [data, state]);
}

/** Who signs here: the role's person, or a signing link's holder. */
export interface Signer { by: string; name: string; title: string;
  role: Role }

export function useSigner(linkKey?: string): Signer {
  const { data, state } = useDemo();
  const { world, rows } = useEsign();
  if (linkKey !== undefined) {
    const p = world.profiles.find((x) => x.key === linkKey);
    const any = rows.flatMap((r) => r.doc.signers)
      .find((x) => x.personId === linkKey);
    return { by: linkKey, name: p?.name ?? any?.name ?? linkKey,
      title: p?.role ?? any?.role ?? "", role: state.role };
  }
  const id = actorOf(data, state);
  const person = data.people.person(id);
  return { by: id, name: person?.name.en ?? id,
    title: person?.role.en ?? "", role: state.role };
}

export function Word(p: { word: EsignRow["progress"]["word"] }) {
  return <span className={s.word} data-word={p.word}>{p.word}</span>;
}

/** The signed stamp: the shared SignStamp (signer, role, date and
 * time), with the signature itself, the reference and the hash. */
export function Stamp(p: { mark: EsignMark; fingerprint: string;
  style?: string | undefined }) {
  const m = p.mark;
  const signed = m.verdict === "signed";
  return (
    <SignStamp className={s.stamp} label={signed ? E.signed : E.declined}
      name={m.name} role={m.role} seal={signed} declined={!signed}
      fresh={justSigned(m.ref)}
      when={`${m.on.display}, ${m.time} · ${E.method(m.method)}`}>
      {signed && (m.path !== null ? (
        <svg className={s.drawn} viewBox="0 0 300 120" role="img" data-sig=""
          aria-label={`${E.method("drawn")}: ${m.name}`}>
          <path d={m.path} fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round"
            strokeLinejoin="round" />
        </svg>) : (
        <span className={s.script} data-style={p.style} data-sig="">
          {m.typed}</span>))}
      {m.reason !== null && (
        <span className={s.line}>{E.reason}: {m.reason}</span>)}
      <span className={s.muted}>{E.reference} {m.ref}</span>
      <span className={s.muted}>{E.fingerprint}{" "}
        <span className={s.hex}>{groupHex(p.fingerprint)}</span></span>
    </SignStamp>
  );
}

/** Signers in order, each with their stamp or whose turn it is. */
function Signers(p: { row: EsignRow; fingerprint: string;
  styleOf(by: string): string | undefined }) {
  const next = p.row.progress.next;
  return (
    <ol className={s.signers} aria-label={E.signers}>
      {p.row.progress.lines.map((l) => (
        <li key={l.signer.order} className={s.signer}>
          <span className={s.order}>{l.signer.order}</span>
          <span className={s.section}>
            <span>{l.signer.name}, {l.signer.role}
              <span className={s.muted}> · {l.signer.signsAs}</span></span>
            {l.mark !== null ? (
              <Stamp mark={l.mark} fingerprint={p.fingerprint}
                style={p.styleOf(l.mark.by)} />
            ) : (
              <span className={s.muted}>{next?.order === l.signer.order
                ? "Awaiting signature" : "Signs after the one before"}
              </span>)}
          </span>
        </li>))}
    </ol>
  );
}

/**
 * The block every paper that needs a signature carries: its status,
 * the signers in order and their stamps, and "Sign document
 * electronically" (secondary: the screen keeps its own primary).
 */
export function SignBlock(p: { docId: string; as?: Signer;
  heading?: boolean; level?: 2 | 3; compact?: boolean }) {
  const { data, state, dispatch } = useDemo();
  const { world, rows } = useEsign();
  const me = useSigner();
  const who = p.as ?? me;
  const toast = useToast();
  const [open, setOpen] = useState(false);
  // The sheet stays for its slide out (ui/presence.ts).
  const sheet = usePresence(open, 240);
  const undo = useUndo();
  const row = rows.find((r) => r.doc.id === p.docId);
  // A new stamp (or the row card opening into the block) eases the
  // card's height, once the sheet has gone (audit 2, item 6).
  const card = useRef<HTMLElement>(null);
  useHeightTween(card, row?.progress.lines.filter((l) => l.mark !== null)
    .length);
  if (row === undefined) return null;
  const fp = fingerprintOf(data, row.doc);
  const styleOf = (by: string) =>
    world.profiles.find((x) => x.key === by)?.style;
  const mine = undoable(state.esignLog, row.doc.id, who.by);
  const office = p.as === undefined && (state.role === "hr" ||
    state.role === "gm" || state.role === "it");
  const reminded = lastReminder(state.esignLog, row.doc.id);
  const mayTap = row.progress.word === "Awaiting signature" && (office ||
    row.progress.next?.personId === who.by);
  // One row per paper nobody has signed yet: its name, one status
  // word, who signs, and a short Sign button.
  if (p.compact === true && row.progress.lines.every((l) =>
    l.mark === null)) {
    return (
      <section className={s.rowCard} ref={card}
        aria-label={`E-signature: ${row.doc.title}`}>
        <span className={s.rowText}>
          <h3 className={s.rowTitle}>{row.doc.title}</h3>
          <span className={s.muted}>
            {row.progress.next?.personId === who.by ? E.youSign
              : E.turnOf(row.progress.next?.name ?? "")}</span>
          <Word word={row.progress.word} />
        </span>
        {mayTap && (
          <button type="button" className={`${b.btn} ${b.secondary}`}
            aria-label={`${E.sign}: ${row.doc.title}`}
            onClick={() => setOpen(true)}>{E.signShort}</button>)}
        {sheet.mounted && <SignSheet open={open} row={row} who={who}
          fingerprint={fp} onClose={() => setOpen(false)} />}
      </section>
    );
  }
  return (
    <section className={s.block} ref={card}
      aria-label={`E-signature: ${row.doc.title}`}>
      <div className={s.blockHead}>
        {p.heading !== false && (p.level === 2
          ? <h2 className={s.blockTitle}>{row.doc.title}</h2>
          : <h3 className={s.blockTitle}>{row.doc.title}</h3>)}
        <Word word={row.progress.word} />
      </div>
      <Signers row={row} fingerprint={fp} styleOf={styleOf} />
      {reminded !== null && (
        <p className={s.note}>{E.reminded(`${data.esign.date(
          reminded.on).display}, ${reminded.time}`)}</p>)}
      <div className={s.row}>
        {row.progress.word === "Awaiting signature" && (office ||
          row.progress.next?.personId === who.by) && (
          <button type="button" className={`${b.btn} ${b.secondary} ${
            s.tall}`} aria-label={`${E.sign}: ${row.doc.title}`}
            onClick={() => setOpen(true)}>{E.sign}</button>)}
        {mine !== null && (
          <button type="button" className={`${b.btn} ${b.quiet} ${s.tall}`}
            onClick={() => undo(row, mine, who)}>{E.undo}</button>)}
        {row.progress.word === "Awaiting signature" &&
          row.progress.next?.personId !== who.by &&
          (state.role === "hr" || state.role === "gm") && (
          <button type="button" className={`${b.btn} ${b.quiet} ${s.tall}`}
            onClick={() => {
              dispatch({ type: "esign", entry: { kind: "remind",
                target: row.doc.id, by: who.by, name: who.name,
                title: who.title, role: who.role, on: data.esign.asOf } });
              toast.show(E.remindToast(row.progress.next?.name ?? ""));
            }}>{E.remind}</button>)}
      </div>
      {sheet.mounted && <SignSheet open={open} row={row} who={who}
        fingerprint={fp} onClose={() => setOpen(false)} />}
    </section>
  );
}

/** Takes back a signature, and the step it made on its own screen. */
export function useUndo() {
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  return (row: EsignRow, seq: number, who: Signer,
    verdict?: "signed" | "declined"): void => {
    dispatch({ type: "esign", entry: { kind: "undo", target: seq,
      docId: row.doc.id, by: who.by, name: who.name, title: who.title,
      role: who.role, on: data.esign.asOf } });
    const was = state.esignLog.find((e) => e.seq === seq);
    const signed = (verdict ?? (was?.kind === "sign" ? was.verdict
      : "declined")) === "signed";
    undoSteps(row, who.by, signed).forEach(dispatch);
    toast.show(E.undone);
  };
}

/** A signature pad: pointer strokes kept as an SVG path. */
function Pad(p: { path: string; onChange(path: string): void }) {
  const ref = useRef<SVGSVGElement>(null);
  const drawing = useRef(false);
  const at = (e: PointerEvent<SVGSVGElement>): string => {
    const r = ref.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 300;
    const y = ((e.clientY - r.top) / r.height) * 120;
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  };
  return (
    <svg ref={ref} className={s.pad} viewBox="0 0 300 120" role="img"
      aria-label={E.pad}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drawing.current = true;
        p.onChange(`${p.path} M ${at(e)}`.trim());
      }}
      onPointerMove={(e) => {
        if (drawing.current) p.onChange(`${p.path} L ${at(e)}`);
      }}
      onPointerUp={() => { drawing.current = false; }}
      onPointerCancel={() => { drawing.current = false; }}>
      <path d={p.path === "" ? "M 0 0" : p.path} fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
        strokeLinejoin="round" />
    </svg>
  );
}

/** "3ee2...4d83": the first and last four of the fingerprint. */
const fold = (hex: string): string => `${hex.slice(0, 4)}…${hex.slice(-4)}`;

const same = (a: string, b: string): boolean =>
  a.trim().replace(/\s+/g, " ").toLowerCase() ===
    b.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * The sign sheet: who signs and in which order, the paper, who is
 * signing, a typed name (or a drawing), the consent, then Sign. One
 * quiet sentence says it is a demo and claims no legal validity.
 */
export function SignSheet(p: { row: EsignRow; who: Signer;
  fingerprint: string; onClose(): void; open?: boolean }) {
  const { data, state, dispatch } = useDemo();
  const { world } = useEsign();
  const toast = useToast();
  const undo = useUndo();
  const { row, who } = p;
  const [method, setMethod] = useState<"typed" | "drawn">("typed");
  const [typed, setTyped] = useState("");
  const [path, setPath] = useState("");
  const [agree, setAgree] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const next: EsignSigner | null = row.progress.next;
  const myTurn = next !== null && next.personId === who.by;
  const listed = row.doc.signers.some((x) => x.personId === who.by);
  const style = world.profiles.find((x) => x.key === who.by)?.style;
  // The signature is recorded once the sheet has gone: the sheet
  // closes on what it showed, and the card behind changes after it,
  // never under the scrim. Unmounting runs it (the sheet's exit
  // ended, or the page went away), so it is never lost.
  const pending = useRef<(() => void) | null>(null);
  useEffect(() => () => {
    const run = pending.current;
    pending.current = null;
    run?.();
  }, []);
  const finish = (verdict: "signed" | "declined"): void => {
    if (pending.current !== null) return;
    pending.current = () => record(verdict);
    p.onClose();
  };
  const record = (verdict: "signed" | "declined"): void => {
    // The stamp the signature makes lands once, wherever it shows.
    markSigned(data.esign.ref(row.doc.id, next!.order));
    dispatch({ type: "esign", entry: { kind: "sign", docId: row.doc.id,
      order: next!.order, verdict, method, typed: typed.trim() || who.name,
      path: method === "drawn" && verdict === "signed" ? path : null,
      reason: verdict === "declined" ? reason.trim() : null,
      fingerprint: p.fingerprint, by: who.by, name: who.name,
      title: who.title, role: who.role, on: data.esign.asOf } });
    const h = row.doc.host;
    if (row.doc.kind === "policy-ack" && verdict === "signed") {
      dispatch({ type: "safety-mark", key: ackKey(row), mark: {
        status: "read", by: who.by, role: who.role, on: data.esign.asOf } });
    }
    if (h.area === "letters" && verdict === "signed") {
      dispatch({ type: "paper-step", id: h.sourceId,
        step: stepBy(data, state, "issued") });
    }
    if (h.area === "offers" && next!.party === "candidate") {
      dispatch({ type: "move-step", key: `offer:${h.sourceId}`,
        step: { value: verdict === "signed" ? "accepted" : "declined",
          from: "sent", by: who.by, role: who.role, on: data.esign.asOf } });
    }
    const seq = state.nextEsign;
    const say = (): void => toast.show(verdict === "signed"
      ? E.signedToast(row.doc.title) : E.declinedToast(row.doc.title),
    () => undo(row, seq, who, verdict));
    // On a phone the toast would sit on the stamp as it lands: it
    // waits until the stamp has settled, and only on the same page.
    const phone = typeof matchMedia === "function" &&
      matchMedia("(max-width: 760px)").matches;
    if (!phone || reducedMotion()) return say();
    const hash = location.hash;
    const { land } = signSequence(verdict === "signed");
    setTimeout(() => {
      if (location.hash === hash) say();
    }, land + STAMP_MS);
  };
  const submit = (): void => {
    if (declining) {
      if (reason.trim() === "") return setError(E.reasonNeeded);
      return finish("declined");
    }
    if (method === "typed" && !same(typed, who.name)) {
      return setError(E.mismatch(who.name));
    }
    if (method === "drawn" && path === "") return setError(E.needDrawing);
    if (!agree) return setError(E.consentNeeded);
    finish("signed");
  };
  return (
    <Sheet open={p.open ?? true} title={row.doc.title}
      onClose={p.onClose}>
      <div className={t.form}>
        <section className={s.section} aria-labelledby="es-order">
          <h3 id="es-order" className={s.sectionTitle}>{E.signers}</h3>
          <ol className={s.signers}>
            {row.progress.lines.map((l) => (
              <li key={l.signer.order} className={s.signer}>
                <span className={s.order}>{l.signer.order}</span>
                <span>{l.signer.name}, {l.signer.role}
                  <span className={s.muted}> · {l.mark === null
                    ? (next?.order === l.signer.order ? "Awaiting signature"
                      : "Signs after the one before")
                    : l.mark.verdict === "signed" ? `${E.signed} ${
                      l.mark.on.display}, ${l.mark.time}` : E.declined}
                  </span></span>
              </li>))}
          </ol>
        </section>
        <section className={s.section} aria-labelledby="es-doc">
          <h3 id="es-doc" className={s.sectionTitle}>{E.preview}</h3>
          <div className={s.preview} tabIndex={0} role="region"
            aria-label={row.doc.title}>{row.doc.lines.join("\n")}</div>
          <details className={s.fold}>
            <summary className={s.muted}>{E.fingerprint}{" "}
              <span className={s.hex}>{fold(p.fingerprint)}</span>
            </summary>
            <p className={s.muted}><span className={s.hex}>
              {groupHex(p.fingerprint)}</span></p>
            <p className={s.note}>{E.fingerprintHelp}</p>
          </details>
        </section>
        {!myTurn ? (
          <p className={t.route} role="status">{listed ? E.notYourTurn
            : E.notSigner}</p>
        ) : (
          <form className={t.form} noValidate onSubmit={(e) => {
            e.preventDefault(); submit(); }}>
            <p className={s.section}>
              <span className={s.sectionTitle}>{E.identity}</span>
              <span>{who.name}, {who.title} · {next.signsAs}</span>
            </p>
            {declining ? (
              <label className={t.field}>
                <span>{E.reason}</span>
                <textarea value={reason} rows={2}
                  onChange={(e) => { setReason(e.target.value);
                    setError(null); }} />
              </label>
            ) : (
              <>
                <fieldset className={s.methods}>
                  <legend>{E.how}</legend>
                  {(["typed", "drawn"] as const).map((m) => (
                    <label key={m} className={s.choice}>
                      <input type="radio" name="es-method" value={m}
                        checked={method === m}
                        onChange={() => { setMethod(m); setError(null); }} />
                      {m === "typed" ? E.byTyping : E.byDrawing}
                    </label>))}
                </fieldset>
                <label className={t.field}>
                  <span>{E.typedLabel}</span>
                  <input value={typed} autoComplete="name"
                    onChange={(e) => { setTyped(e.target.value);
                      setError(null); }} />
                  <small>{E.typedHelp(who.name)}</small>
                </label>
                {method === "typed" ? (
                  typed.trim() !== "" && (
                    <span className={s.script} data-style={style}
                      aria-hidden="true">{typed}</span>)
                ) : (
                  <div className={s.section}>
                    <Pad path={path} onChange={(x) => { setPath(x);
                      setError(null); }} />
                    <div>
                      <button type="button"
                        className={`${b.btn} ${b.quiet} ${s.tall}`}
                        onClick={() => setPath("")}>{E.clear}</button>
                    </div>
                  </div>
                )}
                <label className={s.consent}>
                  <input type="checkbox" checked={agree}
                    onChange={(e) => { setAgree(e.target.checked);
                      setError(null); }} />
                  <span>{data.esign.consent}</span>
                </label>
              </>
            )}
            {error !== null && <p className={t.error} role="alert">{error}</p>}
            <p className={s.note}>{data.esign.note}</p>
            <div className={t.formActions}>
              <button type="submit" className={`${b.btn} ${b.primary} ${
                s.tall}`}>{declining ? E.declineSubmit : E.submit}</button>
              <button type="button" className={`${b.btn} ${b.quiet} ${s.tall}`}
                onClick={() => { setDeclining(!declining); setError(null); }}>
                {declining ? E.back : E.decline}</button>
            </div>
          </form>
        )}
        {!myTurn && <p className={s.note}>{data.esign.note}</p>}
      </div>
    </Sheet>
  );
}

/** A record's "E-signature" tab: the SignBlocks of the papers given. */
export function signTab(...docIds: string[]): RecordTab {
  return { id: "esign", label: "E-signature", render: () => (
    <SignTabBody docIds={docIds} />) };
}

function SignTabBody(p: { docIds: string[] }) {
  const { data } = useDemo();
  const { rows } = useEsign();
  const shown = p.docIds.filter((id) => rows.some((r) => r.doc.id === id));
  return (
    <div className={s.page}>
      <p className={s.note}>{data.esign.note}</p>
      {shown.length === 0 ? <p className={s.note}>{E.noneHere}</p>
        : shown.map((id) => <SignBlock key={id} docId={id} level={2} />)}
    </div>
  );
}

/** A joining pack's tab: its count, reminders, then each paper. */
export function packTab(key: string | null | undefined): RecordTab {
  return { id: "esign-pack", label: "Signing pack", render: () => (
    <PackTabBody k={key ?? ""} />) };
}

function PackTabBody(p: { k: string }) {
  const { world } = useEsign();
  const pack = world.packs.find((x) => x.key === p.k);
  if (pack === undefined) return <p className={s.note}>{E.noneHere}</p>;
  return (
    <div className={s.page}>
      <PackLine packKey={pack.key} />
      <SignTabBody docIds={pack.docIds} />
    </div>
  );
}

/** A paper's status word and a link to its record in the register. */
export function SignLink(p: { docId: string }) {
  const { rows } = useEsign();
  const row = rows.find((r) => r.doc.id === p.docId);
  if (row === undefined) return null;
  return (
    <a className={s.muted} href={hrefOf("people", "files", "signatures",
      row.doc.id)}>{`E-signature: ${row.progress.word}`}</a>
  );
}
