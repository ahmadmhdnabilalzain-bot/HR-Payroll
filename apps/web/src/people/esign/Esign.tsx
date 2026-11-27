import { useRef } from "react";
import { useFlip } from "../../demo/motion";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { FilterList, PageHead } from "../../ui/templates";
import t from "../../ui/templates/templates.module.css";
import { Outside } from "../team/common";
import { packCount, waitingFor, type EsignRow } from "./model";
import { PaperRow, type PaperKind } from "./PaperRow";
import { useEsign, useSigner, type Signer } from "./Sign";
import s from "./esign.module.css";
import { E } from "./words";

/**
 * `#/people/esign/<screen>`: signing profiles (who is registered),
 * signing links (one per new person or candidate) and a link's own
 * page, where that person reads and signs on their phone. The link
 * page is open to whoever holds the link (the registry lets every
 * role in); the lists are for HR, the General manager and IT.
 */
export function Esign(p: { rest: string[] }) {
  const { state } = useDemo();
  const [screen, key] = p.rest;
  if (screen === "link") {
    return key === undefined ? <LinkHelp /> : <LinkPage k={key} />;
  }
  if (state.role !== "hr" && state.role !== "gm" && state.role !== "it") {
    return <Outside />;
  }
  if (screen === "profiles") return <Profiles />;
  if (screen === "links") return <Links />;
  return <Outside />;
}

export const linkHref = (key: string): string =>
  hrefOf("people", "esign", "link", key);

function Profiles() {
  const { world } = useEsign();
  return (
    <FilterList title={E.profiles} lede={E.profilesLede}
      rows={world.profiles} rowKey={(r) => r.key}
      searchText={(r) => `${r.name} ${r.role} ${r.email}`}
      rowHref={(r) => r.source === "staff" ? undefined : linkHref(r.key)}
      segments={[
        { id: "all", label: E.all, match: () => true },
        { id: "new", label: "New people", match: (r) =>
          r.source !== "staff" },
      ]}
      columns={[
        { key: "p", label: E.person, render: (r) => (
          <span className={s.section}><span>{r.name}</span>
            <small className={s.muted}>{r.role}</small></span>) },
        { key: "e", label: E.email, render: (r) => r.email },
        { key: "s", label: E.style, render: (r) => (
          <span className={s.section}>
            <span className={s.script} data-style={r.style}>{r.name}</span>
            <small className={s.muted}>{r.style}</small></span>) },
        { key: "r", label: E.registered, render: (r) => (
          <span className={s.section}><span>{r.display.registered}</span>
            <small className={s.muted}>{r.display.source}</small></span>) },
        { key: "c", label: E.consent, render: (r) =>
          r.consentOn.display },
      ]}
      empty={E.nothing} />
  );
}

interface LinkRow { key: string; name: string; text: string }

function Links() {
  const { world, rows } = useEsign();
  const packs: LinkRow[] = world.packs.map((p) => {
    const n = packCount(rows, p);
    return { key: p.key, name: p.name, text: world.closed.has(p.key)
      ? E.packClosed : E.pack(n.signed, n.total) };
  });
  const candidates: LinkRow[] = rows.flatMap((r) => {
    const x = r.progress.next;
    return x?.party === "candidate" && !packs.some((p) =>
      p.key === x.personId) ? [{ key: x.personId, name: x.name,
      text: `${r.doc.title}: ${r.progress.word}` }] : [];
  });
  return (
    <FilterList title="Signing links" lede={"One link for each new " +
      "person or candidate, passed on by HR. Whoever holds it reads and " +
      "signs their papers on their own phone."}
      rows={[...packs, ...candidates]} rowKey={(r) => r.key}
      searchText={(r) => r.name} rowHref={(r) => linkHref(r.key)}
      columns={[
        { key: "n", label: E.person, render: (r) => r.name },
        { key: "t", label: E.status, render: (r) => r.text },
      ]}
      empty={E.nothing} />
  );
}

function LinkHelp() {
  return (
    <div className={`${t.page} ${s.page}`}>
      <PageHead title="A signing link" lede={"Open the link HR passed on " +
        "to you. It shows the papers waiting for your signature."} />
    </div>
  );
}

function LinkPage(p: { k: string }) {
  const signer = useSigner(p.k);
  const { rows } = useEsign();
  const known = rows.some((r) => r.doc.signers.some((x) =>
    x.personId === p.k));
  if (!known) return <Outside />;
  return <ToSign signer={signer} title={E.toSignFor(signer.name)}
    lede={E.linkLede(signer.name)} />;
}

/**
 * Papers for one signer, on the page grid: those waiting for them
 * first, then those waiting for someone else, then the ones signed or
 * declined, each a one-line row on a white grouped list (PaperRow).
 * Used by the Me page and by a signing link.
 */
export function ToSign(p: { signer: Signer; title: string; lede: string }) {
  const { rows } = useEsign();
  const mine = rows.filter((r) => r.doc.signers.some((x) =>
    x.personId === p.signer.by));
  const waiting = waitingFor(mine, p.signer.by);
  const rest = mine.filter((r) => !waiting.includes(r));
  const others = rest.filter((r) =>
    r.progress.word === "Awaiting signature");
  const closed = rest.filter((r) => !others.includes(r));
  // A paper just signed moves from "waiting" to "finished": the rows
  // and headings slide to their new places instead of jumping. The
  // signed one is new in its list (its stamp lands there), so it does
  // not travel over the others.
  const page = useRef<HTMLDivElement>(null);
  useFlip(page, [rows]);
  const list = (id: string, title: string, flip: string,
    papers: EsignRow[], kind: PaperKind, key = (r: EsignRow) => r.doc.id) =>
    papers.length === 0 ? null : (
      <section className={s.section} aria-labelledby={id}>
        <h2 id={id} className={s.sectionTitle} data-flip={flip}>{title}</h2>
        <ul className={s.papers}>
          {papers.map((r) => (
            <PaperRow key={r.doc.id} row={r} as={p.signer} kind={kind}
              flip={key(r)} />))}
        </ul>
      </section>);
  return (
    <div className={`${t.page} ${s.signPage}`} ref={page}>
      <PageHead title={p.title} lede={p.lede} />
      {waiting.length === 0 ? (
        <section className={s.section} aria-labelledby="ts-wait">
          <h2 id="ts-wait" className={s.sectionTitle} data-flip="h-wait">
            {E.waitingYou(0)}</h2>
          <p className={s.note}>{E.nothing}</p>
        </section>
      ) : list("ts-wait", E.waitingYou(waiting.length), "h-wait", waiting,
        "mine")}
      {list("ts-others", E.others, "h-others", others, "others")}
      {list("ts-done", E.finished, "h-done", closed, "closed",
        (r) => `done:${r.doc.id}`)}
    </div>
  );
}

/** `#/me/sign`: the viewer's own papers to sign (E: Documents to sign). */
export function MySign() {
  const signer = useSigner();
  return <ToSign signer={signer} title={E.toSign} lede={E.toSignLede} />;
}
