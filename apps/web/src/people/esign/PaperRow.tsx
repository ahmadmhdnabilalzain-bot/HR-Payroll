import { useState } from "react";
import { undoable } from "../../demo/esign-state";
import { useDemo } from "../../demo/state";
import b from "../../ui/button.module.css";
import { usePresence } from "../../ui/presence";
import { Sheet } from "../../ui/templates";
import { fingerprintOf, type EsignRow } from "./model";
import { SignBlock, SignSheet, Stamp, useEsign, useUndo,
  type Signer } from "./Sign";
import s from "./esign.module.css";
import { E } from "./words";

/** Which list of the signer's page a paper is in. */
export type PaperKind = "mine" | "others" | "closed";

/** The signer's own mark on a paper, when they made one. */
function markOf(row: EsignRow, by: string) {
  return row.progress.lines.find((l) => l.signer.personId === by &&
    l.mark !== null)?.mark ?? null;
}

/**
 * One paper on the signer's page, one line on the white grouped list:
 * its name, then what is left to say (the section already says it
 * waits for them), and one action.
 * - mine: Sign (the sign sheet).
 * - others: whose turn it is.
 * - closed: "Signed 17 January" and View, which opens the paper's
 *   stamps in a sheet.
 * A paper the viewer signed in this visit has "Undo my signature";
 * the one signed last also keeps its stamp under the row, where it
 * landed.
 */
export function PaperRow(p: { row: EsignRow; as: Signer;
  kind: PaperKind; flip: string }) {
  const { data, state } = useDemo();
  const { world } = useEsign();
  const undo = useUndo();
  const [open, setOpen] = useState<"sign" | "view" | null>(null);
  const sign = usePresence(open === "sign", 240);
  const { row, as } = p;
  const title = row.doc.title;
  const mark = markOf(row, as.by);
  // Signed by this viewer in this visit (whichever list the paper is
  // in now, e.g. still waiting for a second signer): Undo and stamp.
  const mine = undoable(state.esignLog, row.doc.id, as.by);
  // Only the latest of those shows its stamp (where it just landed);
  // the earlier ones fold back to a line, so the page stays short.
  const latest = state.esignLog.filter((e) => e.kind === "sign" &&
    e.by === as.by).at(-1)?.seq;
  const stamped = mine !== null && mine === latest;
  const fp = fingerprintOf(data, row.doc);
  const style = world.profiles.find((x) => x.key === as.by)?.style;
  const meta = p.kind === "others"
    ? E.turnOf(row.progress.next?.name ?? "")
    : p.kind === "closed" ? (mark === null ? row.progress.word
      : `${mark.verdict === "signed" ? E.signed : E.declined} ${
        mark.on.display}`) : null;
  return (
    <li className={s.paper} data-kind={p.kind} data-flip={p.flip}>
      <span className={s.paperLine}>
        <span className={s.paperTitle}>{title}</span>
        {meta !== null && <span className={s.paperMeta}>{meta}</span>}
        <span className={s.paperActions}>
          {p.kind === "mine" && (
            <button type="button" className={`${b.btn} ${b.secondary}`}
              aria-label={`${E.sign}: ${title}`}
              onClick={() => setOpen("sign")}>{E.signShort}</button>)}
          {mine !== null && (
            <button type="button" className={`${b.btn} ${b.quiet}`}
              onClick={() => undo(row, mine, as)}>{E.undo}</button>)}
          {p.kind === "closed" && (
            <button type="button" className={`${b.btn} ${b.quiet}`}
              aria-label={`${E.view}: ${title}`}
              onClick={() => setOpen("view")}>{E.view}</button>)}
        </span>
      </span>
      {stamped && mark !== null && (
        <Stamp mark={mark} fingerprint={fp} style={style} />)}
      {sign.mounted && (
        <SignSheet open={open === "sign"} row={row} who={as}
          fingerprint={fp} onClose={() => setOpen(null)} />)}
      {p.kind === "closed" && (
        <Sheet open={open === "view"} title={title}
          onClose={() => setOpen(null)}>
          <SignBlock docId={row.doc.id} as={as} heading={false} />
        </Sheet>)}
    </li>
  );
}
