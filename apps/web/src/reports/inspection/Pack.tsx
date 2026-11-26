import type { ReactNode } from "react";
import { Money } from "../../ui/Money";
import type { AuditData } from "./data";
import { useLivePack } from "./live";
import { useMaskText } from "../../ui/mask";
import s from "./audit.module.css";

/**
 * One month of evidence, all on one page so it prints as one PDF. It
 * says on the page, and on the printout, that it is not an authority
 * filing. Read only: nothing here can be changed.
 */
function Section(p: { title: string; children: ReactNode }) {
  return (
    <section className={s.section} aria-label={p.title}>
      <h2 className={s.sectionTitle}>{p.title}</h2>
      {p.children}
    </section>
  );
}

const Empty = (p: { children: string }) => (
  <p className={s.empty}>{p.children}</p>
);

type InspectionPack = AuditData["packs"][string];

export function PackBody(p: { pack: InspectionPack; month: string }) {
  const pack = useLivePack(p.pack, p.month);
  // Amounts in the sentences follow "Hide amounts" like <Money/>.
  const mask = useMaskText();
  const r = pack.register;
  return (
    <article className={s.pack} aria-label={pack.title}>
      <header className={s.packHead}>
        <h2 className={s.packTitle}>{pack.title}</h2>
        <p className={s.banner} role="note">{pack.note}</p>
      </header>
      <Section title="Payroll register">
        <dl className={s.figures}>
          <div><dt>Status</dt><dd>{pack.statusText}</dd></div>
          <div><dt>People paid</dt><dd>{r.display.headcount}</dd></div>
          <div><dt>Gross pay</dt><dd><Money value={r.gross} /></dd></div>
          <div><dt>Deductions</dt><dd><Money value={r.deductions} /></dd></div>
          <div><dt>Net pay</dt><dd><Money value={r.net} /></dd></div>
        </dl>
        <div className={s.scroll} tabIndex={0} role="region"
          aria-label={`Payroll register, ${pack.title}`}>
          <table className={s.table}>
            <caption className="visually-hidden">
              Payroll register, {pack.title}
            </caption>
            <thead>
              <tr><th scope="col">Person</th>
                <th scope="col" className={s.num}>Gross</th>
                <th scope="col" className={s.num}>Net</th></tr>
            </thead>
            <tbody>
              {r.lines.map((l) => (
                <tr key={l.number}>
                  <td>{l.name}<br /><span className={s.sub}>{l.number}</span>
                  </td>
                  <td className={s.num}><Money value={l.gross} size="sm"
                    tween={false} /></td>
                  <td className={s.num}><Money value={l.net} size="sm"
                    tween={false} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title="Sign-offs, with who and when">
        {pack.signOffs.length === 0
          ? <Empty>No sign-offs recorded for this month.</Empty> : (
            <ul className={s.panel}>
              {pack.signOffs.map((x) => (
                <li key={x.id} className={s.row}>
                  <span className={s.main}>
                    <span>{x.kindText}: {mask(x.subject)}</span>
                    <small className={s.sub}>Asked by {x.askedBy}
                      {x.askedOn === "" ? "" : `, ${x.askedOn}`}</small>
                  </span>
                  <span className={s.end}>
                    {x.decidedOn === "Not yet" ? `Waiting for ${x.decider}`
                      : `${x.outcomeText} by ${x.decider}, ${x.decidedOn}`}
                  </span>
                </li>
              ))}
            </ul>)}
      </Section>
      <Section title="Salary file register">
        {pack.files.length === 0
          ? <Empty>No salary file recorded for this month.</Empty> : (
            <ul className={s.panel}>
              {pack.files.map((f) => (
                <li key={f.id} className={s.row}>
                  <span className={s.main}>
                    <span>{f.what}</span>
                    <small className={`${s.sub} ${s.mono}`} dir="ltr">
                      {f.name}</small>
                  </span>
                  <span className={s.end}>{f.who}, {f.when}</span>
                </li>
              ))}
            </ul>)}
      </Section>
      <Section title="Exceptions, with their reasons">
        {pack.exceptions.length === 0
          ? <Empty>No exceptions recorded for this month.</Empty> : (
            <ul className={s.panel}>
              {pack.exceptions.map((x) => (
                <li key={x.id} className={s.row}>
                  <span className={s.main}>
                    <span>{x.title}</span>
                    <small className={s.sub}>{mask(x.reason)}</small>
                  </span>
                  <span className={s.end}>{x.severityText}. {mask(x.statusText)}
                  </span>
                </li>
              ))}
            </ul>)}
      </Section>
      <Section title="Audit chain check">
        <p className={s.empty} role="status">{pack.chain.text}</p>
        <p className={s.sub}>Last entry up to this month: {pack.chain.headOn},
          fingerprint <span className={s.mono} dir="ltr">
            {pack.chain.headShort}</span>. Worked out in the browser when
          the page loads; it shows the idea and is not a legal proof.</p>
      </Section>
      <Section title="Policy versions in force">
        <ul className={s.panel}>
          {pack.policies.map((x) => (
            <li key={x.id} className={s.row}>
              <span className={s.main}>
                <span>{x.name}</span>
                <small className={s.sub}>Kept by {x.owner}</small>
              </span>
              <span className={s.end}>{x.version}, from {x.inForceFrom}</span>
            </li>
          ))}
        </ul>
      </Section>
      <p className={s.sub}>{pack.note}</p>
    </article>
  );
}
