import type { KeyboardEvent } from "react";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { countOf, panelOf, routeOf } from "../nav/registry";
import type { SectionId } from "../nav/types";
import { Icon } from "../ui/Icon";
import { pickGroup } from "./groupTabs";
import s from "./SectionList.module.css";

/** Arrow keys move between the areas of a panel or section page. */
function onArrows(e: KeyboardEvent<HTMLElement>): void {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  const links = [...e.currentTarget.querySelectorAll<HTMLAnchorElement>(
    "a[data-area]")];
  const at = links.findIndex((a) => a === document.activeElement);
  const next = links[(at + (e.key === "ArrowDown" ? 1 : links.length - 1)) %
    links.length];
  if (next === undefined) return;
  e.preventDefault();
  next.focus();
}

/**
 * A section's groups and areas with live counts, from the registry.
 * The desktop panel and the phone section page both draw this, so they
 * can never disagree. Counts are grey; red only when a count stops pay.
 */
export function SectionList(p: { section: SectionId; variant: "panel" |
  "page"; onPick?(): void; level?: 2 | 3 }) {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const groups = panelOf(state.role, p.section);
  const c = { data, state };
  if (groups.length === 0) {
    return <p className={s.empty}>{t("shell.sectionEmpty")}</p>;
  }
  return (
    <div className={s.groups} data-variant={p.variant} onKeyDown={onArrows}>
      {groups.map(({ group, areas }) => (
        <section key={group.id} className={s.group}
          aria-labelledby={`grp-${p.variant}-${group.section}-${group.id}`}>
          <Heading level={p.level ?? 3}
            id={`grp-${p.variant}-${group.section}-${group.id}`}
            className={groups.length === 1 ? "visually-hidden" : s.heading}>
            {group.label[lang]}
          </Heading>
          <ul className={s.areas}>
            {areas.map((a) => {
              const r = routeOf(a, c);
              const n = countOf(a, c);
              return (
                <li key={a.id}>
                  <a className={s.area} data-area="" onClick={() => {
                    pickGroup(a.section, a.group);
                    p.onPick?.();
                  }}
                    href={hrefOf(r.section, ...(r.rest ?? []))}>
                    <span className={s.label}>{a.label[lang]}</span>
                    {n !== null && (
                      <span className={`${s.count} tabular`}
                        data-stop={a.stopsPay === true}>
                        <span aria-hidden="true">{n}</span>
                        <span className="visually-hidden">
                          {t("shell.countWaiting", { count: n })}
                        </span>
                      </span>
                    )}
                    {p.variant === "page" && (
                      <Icon name="chevronEnd" size={16} />
                    )}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Heading(p: { level: 2 | 3; id: string; className?: string | undefined;
  children: string }) {
  return p.level === 2
    ? <h2 id={p.id} className={p.className}>{p.children}</h2>
    : <h3 id={p.id} className={p.className}>{p.children}</h3>;
}
