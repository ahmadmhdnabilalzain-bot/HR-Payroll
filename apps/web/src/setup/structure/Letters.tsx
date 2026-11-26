import type { Fils } from "@payroll/engine";
import { useState, type ReactNode } from "react";
import { hrefOf } from "../../demo/route";
import { Money } from "../../ui/Money";
import { FilterList, KeyValues, RecordTabs } from "../../ui/templates";
import type { StructureData } from "./data";
import s from "./structure.module.css";
import { NotFound } from "./ui";

const PURPOSES = ["a bank account", "a rental contract",
  "a visa application", "a loan application"];

export function LettersList(p: { d: StructureData }) {
  return (
    <FilterList title="Letter templates"
      lede="The wording behind each letter HR issues. Open one to see
        it filled in for a person."
      rows={p.d.letters} rowKey={(t) => t.id}
      rowHref={(t) => hrefOf("setup", "structure", "letters", t.id)}
      searchText={(t) => t.name}
      columns={[
        { key: "n", label: "Letter", render: (t) => t.name },
        { key: "u", label: "Used", render: (t) => t.display.usage },
        { key: "s", label: "Signed by", render: (t) => t.signedBy }]}
      empty="No letter templates." />
  );
}

/** The salary sentence carries money: show it through Money. */
function Filled(p: { text: string; salary: Fils }) {
  const parts: ReactNode[] = [];
  const re = /AED [\d,]+\.\d{2}/g;
  let at = 0;
  for (const m of p.text.matchAll(re)) {
    parts.push(p.text.slice(at, m.index));
    parts.push(<Money key={m.index} value={p.salary} size="sm"
      tween={false} />);
    at = m.index + m[0].length;
  }
  parts.push(p.text.slice(at));
  return <p className={s.paper}>{parts}</p>;
}

function Preview(p: { d: StructureData; id: string }) {
  const { d } = p;
  const [who, setWho] = useState(d.people[0]!.id);
  const [purpose, setPurpose] = useState(PURPOSES[0]!);
  const [to, setTo] = useState("The Embassy of Sample Land");
  const person = d.people.find((x) => x.id === who)!;
  return (
    <div className={s.section}>
      <div className={s.controls}>
        <label className={s.field}>Person
          <select value={who} onChange={(e) => setWho(e.target.value)}>
            {d.people.map((x) => (
              <option key={x.id} value={x.id}>{x.name}</option>))}
          </select>
        </label>
        <label className={s.field}>For
          <select value={purpose}
            onChange={(e) => setPurpose(e.target.value)}>
            {PURPOSES.map((x) => <option key={x}>{x}</option>)}
          </select>
        </label>
        <label className={s.field}>Addressed to
          <input value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      <Filled text={d.render(p.id, who, purpose, to)}
        salary={person.salary} />
      <p className={s.note}>A preview only. Nothing is issued or sent.</p>
    </div>
  );
}

export function LetterRecord(p: { d: StructureData; id: string;
  tab: string; onTab(t: string): void }) {
  const t = p.d.letters.find((x) => x.id === p.id);
  if (t === undefined) return <NotFound back={hrefOf("setup",
    "structure", "letters")} label="Letter templates" />;
  return (
    <RecordTabs title={t.name}
      lede="The wording is fixed. The fields in braces are filled in
        from the person's record."
      back={{ label: "Letter templates",
        href: hrefOf("setup", "structure", "letters") }}
      stats={[{ label: "Issued", value: String(t.issued) },
        { label: "Waiting", value: String(t.waiting) }]}
      tab={p.tab || "preview"} onTab={p.onTab}
      tabs={[
        { id: "preview", label: "Preview",
          render: () => <Preview d={p.d} id={t.id} /> },
        { id: "wording", label: "Wording", render: () => (
          <div className={s.section}>
            <KeyValues items={[{ label: "Signed by", value: t.signedBy },
              { label: "Filled in", value: t.fields.join(", ") }]} />
            <p className={s.paper}>{t.body}</p>
          </div>) },
      ]} />
  );
}
