import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { FilterList } from "../../ui/templates";
import { Outside } from "../team/common";
import { packCount, waitingFor } from "./model";
import { SignBlock, useEsign, useSigner, type Signer } from "./Sign";
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
    <div className={s.page}>
      <h1 className={s.title}>A signing link</h1>
      <p className={s.lede}>Open the link HR passed on to you. It shows
        the papers waiting for your signature.</p>
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
 * Papers for one signer: those waiting for them first (each with its
 * SignBlock), then the ones they signed. Used by the Me page and by a
 * signing link.
 */
export function ToSign(p: { signer: Signer; title: string; lede: string }) {
  const { data } = useDemo();
  const { rows } = useEsign();
  const mine = rows.filter((r) => r.doc.signers.some((x) =>
    x.personId === p.signer.by));
  const waiting = waitingFor(mine, p.signer.by);
  const rest = mine.filter((r) => !waiting.includes(r));
  return (
    <div className={s.page}>
      <header className={s.section}>
        <h1 className={s.title}>{p.title}</h1>
        <p className={s.lede}>{p.lede}</p>
        <p className={s.note}>{data.esign.note}</p>
      </header>
      <section className={s.section} aria-labelledby="ts-wait">
        <h2 id="ts-wait" className={s.sectionTitle}>
          {E.waitingYou(waiting.length)}</h2>
        {waiting.length === 0 ? <p className={s.note}>{E.nothing}</p> : (
          <ul className={s.cards}>
            {waiting.map((r) => (
              <li key={r.doc.id}><SignBlock docId={r.doc.id}
                as={p.signer} /></li>))}
          </ul>)}
      </section>
      {rest.length > 0 && (
        <section className={s.section} aria-labelledby="ts-done">
          <h2 id="ts-done" className={s.sectionTitle}>{E.done}</h2>
          <ul className={s.cards}>
            {rest.map((r) => (
              <li key={r.doc.id}><SignBlock docId={r.doc.id}
                as={p.signer} /></li>))}
          </ul>
        </section>)}
    </div>
  );
}

/** `#/me/sign`: the viewer's own papers to sign (E: Documents to sign). */
export function MySign() {
  const signer = useSigner();
  return <ToSign signer={signer} title={E.toSign} lede={E.toSignLede} />;
}
