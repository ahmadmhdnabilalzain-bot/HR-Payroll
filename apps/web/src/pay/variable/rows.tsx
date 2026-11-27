import type { ReactNode } from "react";
import { fils, type Fils } from "@payroll/engine";
import { Money } from "../../ui/Money";
import v from "./variable.module.css";

/** The list template's panel, for rows that sit inside a tab. */
export function VarList(p: { label: string; children: ReactNode }) {
  return <ul className={v.list} aria-label={p.label}>{p.children}</ul>;
}

/** One row: the text (a name or label, then small print) and its end. */
export function VarRow(p: { title: ReactNode; note?: ReactNode;
  end: ReactNode }) {
  return (
    <li>
      <span className={v.text}>{p.title}
        {p.note !== undefined && p.note !== null && <small>{p.note}</small>}
      </span>
      <span className={v.end}>{p.end}</span>
    </li>
  );
}

/** A person's name as a link, in ink. */
export function NameLink(p: { href: string; children: ReactNode }) {
  return <a className={v.name} href={p.href}>{p.children}</a>;
}

/** A clawback lowers pay: the word, then a minus sign and the amount. */
export function Clawback(p: { amount: Fils; word?: boolean }) {
  return (
    <span className={v.negative}>
      {p.word !== false && <span>Clawback</span>}
      <Money value={fils(-p.amount)} size="sm" signed />
    </span>
  );
}

export { v as varStyles };
