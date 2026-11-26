import { useState, type ReactNode } from "react";
import { maskNode, useMaskText } from "../mask";
import { PageHead } from "./PageHead";
import s from "./templates.module.css";

export interface RecordStat {
  label: string;
  value: ReactNode;
}

export interface RecordTab {
  id: string;
  label: string;
  render(): ReactNode;
}

/**
 * RT, record page with tabs: a summary strip of at most three figures,
 * then tabs; each tab is a list or a key-value grid (KeyValues). Pass
 * `tab` and `onTab` to drive the tab from the route.
 */
export function RecordTabs(p: {
  title: string;
  lede?: string;
  back?: { label: string; href: string };
  stats: RecordStat[];
  tabs: RecordTab[];
  tab?: string;
  onTab?(id: string): void;
  actions?: ReactNode;
}) {
  const mask = useMaskText();
  const [own, setOwn] = useState(p.tabs[0]?.id ?? "");
  const at = p.tab ?? own;
  const current = p.tabs.find((x) => x.id === at) ?? p.tabs[0];
  return (
    <div className={s.page}>
      <PageHead title={p.title} lede={p.lede} back={p.back}
        actions={p.actions} />
      <dl className={s.stats}>
        {p.stats.slice(0, 3).map((x) => (
          <div key={x.label}>
            <dt>{x.label}</dt>
            <dd>{maskNode(mask, x.value)}</dd>
          </div>
        ))}
      </dl>
      <div className={s.tabs} role="tablist">
        {p.tabs.map((x) => (
          <button key={x.id} type="button" role="tab" id={`tab-${x.id}`}
            aria-selected={x.id === current?.id}
            aria-controls={`tabpanel-${x.id}`}
            onClick={() => (p.onTab ?? setOwn)(x.id)}>
            {x.label}
          </button>
        ))}
      </div>
      {current !== undefined && (
        <div role="tabpanel" id={`tabpanel-${current.id}`}
          aria-labelledby={`tab-${current.id}`} className={s.tabPanel}>
          {current.render()}
        </div>
      )}
    </div>
  );
}

/** A two-column key-value grid (13 px labels, 15 px values). */
export function KeyValues(p: { items: { label: string; value: ReactNode }[] }) {
  const mask = useMaskText();
  return (
    <dl className={s.kv}>
      {p.items.map((x) => (
        <div key={x.label}>
          <dt>{x.label}</dt>
          <dd>{maskNode(mask, x.value)}</dd>
        </div>
      ))}
    </dl>
  );
}
