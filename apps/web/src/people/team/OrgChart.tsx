import { gsap } from "gsap";
import { useId, useLayoutEffect, useMemo, useRef, useState,
  type KeyboardEvent, type RefObject } from "react";
import type { OrgChartNode } from "../../demo/data/team-types";
import { useDemo } from "../../demo/state";
import b from "../../ui/button.module.css";
import { Icon } from "../../ui/Icon";
import { PageHead } from "../../ui/templates";
import { profileHref } from "./common";
import { fill, W } from "./words";
import s from "./org.module.css";
import { Avatar } from "../../ui/Avatar";
import { Footnote } from "../../components/explain";

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
  const depts = [...new Set(root.children.map((k) => k.departmentText))];
  const tone = (d: string): number => (depts.indexOf(d) % 4) + 1;
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
              hit={hit} isOpen={isOpen} toggle={toggle} tone={tone}
              lead={words.length > 0} />
          </ul>
        </div>
      )}
      <Footnote />
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
  /** Department name to grey tone (1 to 4), fixed per chart. */
  tone(dept: string): number;
}

/** The person: face, name, title (and place when it changes). */
function Person(p: { n: OrgChartNode; depth: number; place: string | null;
  match: boolean }) {
  const { n } = p;
  return (
    <a className={s.person} href={profileHref(n.employeeId)}
      data-person={n.employeeId} data-match={p.match ? "true" : undefined}>
      <Avatar id={n.employeeId} name={n.name} className={s.avatar}
        size={p.depth === 0 ? "lg" : p.depth === 1 ? "md" : "sm"} />
      <span className={s.who}>
        <span className={s.name}>{n.name}</span>
        <span className={s.title}>
          {n.title}{p.place === null || p.depth === 0 ? ""
            : `, ${p.place}`}
        </span>
        {p.depth === 1 && <span className={s.dept}>{n.departmentText}</span>}
      </span>
    </a>
  );
}

/**
 * A team opening: its people settle in (240 ms, 30 ms apart), once per
 * opening. Under reduced motion they are simply there.
 */
function useOpening(ref: RefObject<HTMLUListElement | null>,
  open: boolean): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null || !open) return undefined;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(el.children, { opacity: 0, y: -6, duration: 0.24,
        ease: "power2.out", stagger: 0.03, clearProps: "all" });
    });
    return () => mm.revert();
  }, [ref, open]);
}

/**
 * One person and, when open, their team. The General manager is a card
 * at the head; the people reporting to them are cards in a row under
 * one connecting line, each with its department as a grey edge and the
 * team's size on the button that opens it; deeper levels open inside
 * the card as an indented list. On a phone it all reads as one
 * indented list. The DOM is one nested list either way.
 */
function Branch(p: BranchProps) {
  const n = p.node;
  const { keep } = p;
  const kids = n.children.filter((k) => keep === null ||
    keep.has(k.employeeId));
  const expanded = kids.length > 0 && p.isOpen(n.employeeId);
  const list = useRef<HTMLUListElement>(null);
  useOpening(list, expanded);
  if (keep !== null && !keep.has(n.employeeId)) return null;
  const team = sizeOf(n) - 1;
  const w = W.org;
  const place = p.parentPlace !== n.locationText ? n.locationText : null;
  const size = team === 1 ? w.one : fill(w.people, { n: team });
  const toggle = kids.length > 0 ? (
    <button type="button" className={s.toggle}
      aria-expanded={expanded} aria-controls={`team-${n.employeeId}`}
      disabled={keep !== null}
      aria-label={`${p.depth <= 1 ? `${size}. ` : ""}${fill(expanded
        ? w.close : w.open, { name: n.name })}`}
      onClick={() => p.toggle(n.employeeId)}>
      {p.depth <= 1 && <span className={s.toggleText}>{size}</span>}
      <Icon name={expanded ? "chevronDown" : "chevronEnd"} size={16} />
    </button>
  ) : null;
  return (
    <li className={s.node} data-depth={Math.min(p.depth, 2)}
      data-tone={p.depth === 1 ? p.tone(n.departmentText) : undefined}>
      <div className={s.row}>
        {p.depth >= 2 && (toggle ?? (
          <span className={s.spacer} aria-hidden="true" />))}
        <Person n={n} depth={p.depth} place={place}
          match={p.lead && p.hit(n)} />
        {p.depth >= 2 && team > 0 && <span className={s.team}>{size}</span>}
      </div>
      {p.depth <= 1 && (
        <div className={s.foot}>
          {toggle ?? (team === 0 && p.depth === 1 && (
            <span className={s.solo}>{W.org.noTeam}</span>))}
        </div>
      )}
      {expanded && (
        <ul className={p.depth === 0 ? s.level1 : s.nested} ref={list}
          id={`team-${n.employeeId}`}>
          {kids.map((k) => (
            <Branch key={k.employeeId} {...p} node={k}
              depth={p.depth + 1} parentPlace={n.locationText} />
          ))}
        </ul>
      )}
    </li>
  );
}
