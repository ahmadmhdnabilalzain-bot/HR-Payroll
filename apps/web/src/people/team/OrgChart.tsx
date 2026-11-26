import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { OrgChartNode } from "../../demo/data/team-types";
import { useDemo } from "../../demo/state";
import b from "../../ui/button.module.css";
import { Icon } from "../../ui/Icon";
import { PageHead } from "../../ui/templates";
import { initials } from "../words";
import { profileHref } from "./common";
import { fill, W } from "./words";
import s from "./org.module.css";

/** Everyone at and below a node, counting the node itself. */
function sizeOf(n: OrgChartNode): number {
  return 1 + n.children.reduce((sum, k) => sum + sizeOf(k), 0);
}

function flat(n: OrgChartNode, parent: string | null,
  out: Map<string, { node: OrgChartNode; parent: string | null }>) {
  out.set(n.employeeId, { node: n, parent });
  n.children.forEach((k) => flat(k, n.employeeId, out));
  return out;
}

/**
 * P05, Organisation chart. A plain outline you can read at a glance:
 * the General manager, then each department head with a count of the
 * team, opening to the people. Tab goes row by row; the arrow keys walk
 * the visible rows (right opens a team, left closes it or goes up);
 * touch has 44 px targets. A search shows only the branches with a hit.
 */
export function OrgChart() {
  const { data } = useDemo();
  const root = data.team.chart();
  const all = useMemo(() => flat(root, null, new Map()), [root]);
  const [open, setOpen] = useState<Set<string>>(
    () => new Set([root.employeeId]));
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const searchId = useId();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hit = (n: OrgChartNode): boolean => words.every((w) =>
    `${n.name} ${n.title} ${n.departmentText}`.toLowerCase().includes(w));
  const keep = useMemo(() => {
    if (words.length === 0) return null;
    const ids = new Set<string>();
    for (const [id, x] of all) {
      if (!hit(x.node)) continue;
      for (let at: string | null = id; at !== null;
        at = all.get(at)?.parent ?? null) ids.add(at);
    }
    return ids;
  }, [q, all]);
  const matches = keep === null ? all.size
    : [...all.values()].filter((x) => hit(x.node)).length;
  const toggle = (id: string, to?: boolean): void => {
    setOpen((prev) => {
      const next = new Set(prev);
      const want = to ?? !next.has(id);
      if (want) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const isOpen = (id: string): boolean => keep !== null || open.has(id);
  const onKey = (e: KeyboardEvent<HTMLDivElement>): void => {
    const here = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-person]");
    if (here === null || e.target !== here) return;
    const rows = [...(box.current?.querySelectorAll<HTMLElement>(
      "[data-person]") ?? [])];
    const at = rows.indexOf(here);
    const id = here.dataset.person ?? "";
    const node = all.get(id)?.node;
    const go = (el: HTMLElement | undefined): void => {
      if (el === undefined) return;
      e.preventDefault();
      el.focus();
    };
    if (e.key === "ArrowDown") go(rows[at + 1]);
    else if (e.key === "ArrowUp") go(rows[at - 1]);
    else if (e.key === "Home") go(rows[0]);
    else if (e.key === "End") go(rows.at(-1));
    else if (e.key === "ArrowRight" && node !== undefined &&
      node.children.length > 0) {
      e.preventDefault();
      if (!isOpen(id)) toggle(id, true);
      else go(rows[at + 1]);
    } else if (e.key === "ArrowLeft") {
      if (node !== undefined && node.children.length > 0 && isOpen(id) &&
        keep === null) {
        e.preventDefault();
        toggle(id, false);
      } else {
        const up = all.get(id)?.parent ?? null;
        go(rows.find((r) => r.dataset.person === up));
      }
    }
  };
  const w = W.org;
  const withKids = [...all.values()].filter((x) =>
    x.node.children.length > 0).map((x) => x.node.employeeId);
  return (
    <div className={s.page}>
      <PageHead title={w.title} lede={w.lede} />
      <div className={s.tools}>
        <label className={s.search} htmlFor={searchId}>
          <Icon name="search" size={18} />
          <span className="visually-hidden">{w.find}</span>
          <input id={searchId} type="search" value={q} autoComplete="off"
            spellCheck={false} placeholder={w.findHint}
            onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className={s.expand}>
          <button type="button" className={`${b.btn} ${b.secondary} ${s.tall}`}
            onClick={() => setOpen(new Set(withKids))}>{w.expandAll}</button>
          <button type="button" className={`${b.btn} ${b.quiet} ${s.tall}`}
            onClick={() => setOpen(new Set([root.employeeId]))}>
            {w.collapseAll}</button>
        </div>
        <span className={s.count} aria-live="polite">
          {fill(w.shown, { n: matches, total: all.size })}
        </span>
      </div>
      {keep !== null && matches === 0 ? (
        <div className={s.empty}>
          <p>{fill(w.none, { q: q.trim() })}</p>
          <button type="button" className={s.clear}
            onClick={() => setQ("")}>{w.clear}</button>
        </div>
      ) : (
        <div className={s.card} ref={box} onKeyDown={onKey}
          role="group" aria-label={w.tree}>
          <ul className={s.tree}>
            <Branch node={root} depth={0} parentPlace={null} keep={keep}
              hit={hit} isOpen={isOpen} toggle={toggle}
              lead={words.length > 0} />
          </ul>
        </div>
      )}
    </div>
  );
}

interface BranchProps {
  node: OrgChartNode;
  depth: number;
  parentPlace: string | null;
  keep: Set<string> | null;
  hit(n: OrgChartNode): boolean;
  isOpen(id: string): boolean;
  toggle(id: string): void;
  lead: boolean;
}

function Branch(p: BranchProps) {
  const n = p.node;
  const { keep } = p;
  if (keep !== null && !keep.has(n.employeeId)) return null;
  const kids = n.children.filter((k) => keep === null ||
    keep.has(k.employeeId));
  const expanded = kids.length > 0 && p.isOpen(n.employeeId);
  const team = sizeOf(n) - 1;
  const w = W.org;
  const place = p.parentPlace !== n.locationText ? n.locationText : null;
  return (
    <li className={s.node} data-depth={Math.min(p.depth, 2)}>
      <div className={s.row}>
        {kids.length > 0 ? (
          <button type="button" className={s.toggle}
            aria-expanded={expanded} aria-controls={`team-${n.employeeId}`}
            disabled={keep !== null}
            aria-label={fill(expanded ? w.close : w.open,
              { name: n.name })}
            onClick={() => p.toggle(n.employeeId)}>
            <Icon name={expanded ? "chevronDown" : "chevronEnd"}
              size={16} />
          </button>
        ) : <span className={s.spacer} aria-hidden="true" />}
        <a className={s.person} href={profileHref(n.employeeId)}
          data-person={n.employeeId}
          data-match={p.lead && p.hit(n) ? "true" : undefined}>
          <span className={s.avatar} aria-hidden="true">
            {initials(n.name)}
          </span>
          <span className={s.who}>
            <span className={s.name}>{n.name}</span>
            <span className={s.title}>
              {n.title}{place === null || p.depth === 0 ? ""
                : `, ${place}`}
            </span>
          </span>
          {team > 0 && (
            <span className={s.team}>
              {team === 1 ? w.one : fill(w.people, { n: team })}
            </span>
          )}
        </a>
      </div>
      {expanded && (
        <ul className={s.nested} id={`team-${n.employeeId}`}>
          {kids.map((k) => (
            <Branch key={k.employeeId} {...p} node={k}
              depth={p.depth + 1} parentPlace={n.locationText} />
          ))}
        </ul>
      )}
    </li>
  );
}
