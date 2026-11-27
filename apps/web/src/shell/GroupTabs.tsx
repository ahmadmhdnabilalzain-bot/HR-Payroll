import { useEffect, useId, useRef, useState } from "react";
import type { Route } from "../demo/route";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { routeOf } from "../nav/registry";
import { shortOf } from "../nav/short";
import { useGlide } from "../ui/glide";
import { Icon } from "../ui/Icon";
import { tabsAt } from "./groupTabs";
import s from "./GroupTabs.module.css";

/** Pages with their own step control: the pay run's four steps. */
const OWN_STEPS = /^pay-run\/(review|fix|approve|pay)$/;

/**
 * The group tabs shown at `route`, or null: the one rule GroupTabs
 * draws by and PageHead reads, so a page under tabs drops its
 * breadcrumb row and sets its title 56 px under the tabs.
 */
export function useGroupTabs(route: Route)
  : ReturnType<typeof tabsAt> {
  const { data, state } = useDemo();
  if (OWN_STEPS.test([route.section, ...route.rest].join("/"))) {
    return null;
  }
  return tabsAt(state.role, { data, state }, route.section, route.rest);
}

/**
 * The sibling areas of the page you are on, as tabs: the panel opens a
 * group's first area and the rest of the group sits here, drawn from
 * the registry for the role. Shown only on an area's own page (not on
 * a record under it) and only when the group has more than one area.
 */
export function GroupTabs(p: { route: Route }) {
  const { t } = useLocale();
  const found = useGroupTabs(p.route);
  if (found === null) return null;
  return <Tabs found={found} label={t("shell.groupTabs")}
    section={p.route.section} />;
}

/** Sections whose long tab row folds: six tabs, then "More". */
const FOLDS: readonly string[] = ["me"];
const SHOWN = 6;

/**
 * The row itself: its chosen pill glides (ui/glide.ts). In a section
 * that folds (Me, 12 or 13 areas), six tabs show and the rest sit
 * under "More"; the tab you are on always shows among the six.
 */
function Tabs(p: { found: NonNullable<ReturnType<typeof tabsAt>>;
  label: string; section: string }) {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const c = { data, state };
  const row = useRef<HTMLUListElement>(null);
  useGlide(row, "pill");
  const { at, tabs: sibs } = p.found;
  const fold = FOLDS.includes(p.section) && sibs.length > SHOWN + 1;
  const head = sibs.slice(0, SHOWN);
  const shown = !fold ? sibs : head.some((a) => a.id === at.id) ? head
    : [...head.slice(0, SHOWN - 1), at];
  const rest = sibs.filter((a) => !shown.includes(a));
  const hrefOfArea = (a: (typeof sibs)[number]): string => {
    const r = routeOf(a, c);
    return hrefOf(r.section, ...(r.rest ?? []));
  };
  return (
    <nav className={s.wrap} aria-label={p.label} data-vt="tabs">
      <div className={s.line}>
        <ul className={s.tabs} ref={row}>
          {shown.map((a) => (
            <li key={a.id}>
              <a className={s.tab} href={hrefOfArea(a)}
                aria-current={a.id === at.id ? "page" : undefined}>
                {shortOf(a, lang)}
              </a>
            </li>
          ))}
        </ul>
        {rest.length > 0 && (
          <MoreTabs label={t("shell.groupMore")} items={rest.map((a) => ({
            id: a.id, label: shortOf(a, lang), href: hrefOfArea(a) }))} />
        )}
      </div>
    </nav>
  );
}

/**
 * "More": a disclosure with the folded tabs as links. Esc or a click
 * away closes it and focus returns to the button; it fades in on
 * --dur-fast (static under reduced motion, through the tokens).
 */
function MoreTabs(p: { label: string;
  items: { id: string; label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return undefined;
    const away = (e: PointerEvent): void => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent): void => {
      if (e.key !== "Escape") return;
      setOpen(false);
      btn.current?.focus();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className={s.more} ref={box}>
      <button ref={btn} type="button" className={s.tab}
        aria-expanded={open} aria-controls={id}
        onClick={() => setOpen((o) => !o)}>
        {p.label}
        <span className={s.chev} aria-hidden="true">
          <Icon name="chevronDown" size={16} />
        </span>
      </button>
      <ul id={id} className={s.moreList} hidden={!open}>
        {p.items.map((x) => (
          <li key={x.id}>
            <a className={s.moreLink} href={x.href}
              onClick={() => setOpen(false)}>{x.label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}
