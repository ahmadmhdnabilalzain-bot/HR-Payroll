import { useEffect, useRef, type CSSProperties, type KeyboardEvent }
  from "react";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { countOf, panelOf, routeOf } from "../nav/registry";
import { isDecision, shortOf } from "../nav/short";
import type { Area, NavCtx, SectionId } from "../nav/types";
import { Icon } from "../ui/Icon";
import s from "./SectionPanel.module.css";

/** Arrow keys move between every link in the panel. */
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

const hrefOfArea = (a: Area, c: NavCtx): string => {
  const r = routeOf(a, c);
  return hrefOf(r.section, ...(r.rest ?? []));
};

/**
 * The sheet under the bar for one section. Left: what waits for a
 * decision in this section (registry counts that mean a decision, the
 * one that stops pay first). Right: the section's groups, one row
 * each, opening the group's first area; the group's other areas are
 * tabs on that page (GroupTabs). Opens on a word, closes on Esc, a
 * click outside (the faint scrim) or a pick; the first link takes
 * focus.
 */
export function SectionPanel(p: { section: SectionId; label: string;
  onClose(): void; anchor: HTMLElement | null }) {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const box = useRef<HTMLDivElement>(null);
  const c = { data, state };
  const groups = panelOf(state.role, p.section);
  const waiting = groups.flatMap((g) => g.areas)
    .filter(isDecision)
    .map((a) => ({ a, n: countOf(a, c) }))
    .filter((x): x is { a: Area; n: number } => x.n !== null)
    .sort((x, y) => Number(y.a.stopsPay === true) -
      Number(x.a.stopsPay === true) || y.n - x.n);
  useEffect(() => {
    box.current?.querySelector<HTMLElement>("a[data-area]")
      ?.focus({ preventScroll: true });
    const off = (e: Event): void => {
      const t = e.target as Node;
      if (!box.current?.contains(t) && !p.anchor?.contains(t)) p.onClose();
    };
    const esc = (e: globalThis.KeyboardEvent): void => {
      if (e.key !== "Escape") return;
      p.onClose();
      p.anchor?.focus();
    };
    addEventListener("pointerdown", off);
    addEventListener("keydown", esc);
    return () => {
      removeEventListener("pointerdown", off);
      removeEventListener("keydown", esc);
    };
  }, [p]);
  return (
    <>
      <div className={s.scrim} aria-hidden="true" />
      <div ref={box} className={s.panel} role="region" aria-label={p.label}
        id={`panel-${p.section}`}>
        <nav aria-label={p.label} className={s.sheet} onKeyDown={onArrows}>
          <section className={s.waiting} aria-labelledby="panel-waiting">
            <h3 id="panel-waiting" className={s.heading}>
              {t("shell.panelWaiting")}
            </h3>
            {waiting.length === 0 ? (
              <p className={s.none}>{t("shell.panelNothing")}</p>
            ) : (
              <ul className={s.list}>
                {waiting.map(({ a, n }, i) => (
                  <li key={a.id} style={{ "--i": i } as CSSProperties}>
                    <a className={s.action} data-area=""
                      href={hrefOfArea(a, c)} onClick={p.onClose}>
                      <span className={s.count} data-stop={a.stopsPay ===
                        true}>{n}</span>
                      <span className={s.what}>{shortOf(a, lang)}</span>
                      <span className="visually-hidden">
                        {t("shell.countWaiting", { count: n })}
                      </span>
                      <Icon name="chevronEnd" size={16} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className={s.groups} aria-labelledby="panel-groups">
            <h3 id="panel-groups" className={s.heading}>
              {t("shell.panelAreas")}
            </h3>
            <ul className={s.list}>
              {groups.map(({ group, areas }, i) => {
                const first = areas[0];
                if (first === undefined) return null;
                return (
                  <li key={group.id}
                    style={{ "--i": i + waiting.length } as CSSProperties}>
                    <a className={s.group} data-area=""
                      href={hrefOfArea(first, c)} onClick={p.onClose}>
                      <span className={s.groupName}>
                        {areas.length === 1 ? shortOf(first, lang)
                          : group.label[lang]}
                      </span>
                      {areas.length > 1 && (
                        <span className={s.groupAreas}>
                          {areas.map((a) => shortOf(a, lang)).join(" · ")}
                        </span>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        </nav>
      </div>
    </>
  );
}
