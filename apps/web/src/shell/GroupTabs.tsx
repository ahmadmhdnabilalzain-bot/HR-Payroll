import { useRef } from "react";
import type { Route } from "../demo/route";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { routeOf } from "../nav/registry";
import { shortOf } from "../nav/short";
import { useGlide } from "../ui/glide";
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
  return <Tabs found={found} label={t("shell.groupTabs")} />;
}

/** The row itself: its chosen pill glides (ui/glide.ts). */
function Tabs(p: { found: NonNullable<ReturnType<typeof tabsAt>>;
  label: string }) {
  const { lang } = useLocale();
  const { data, state } = useDemo();
  const c = { data, state };
  const row = useRef<HTMLUListElement>(null);
  useGlide(row, "pill");
  const { at, tabs: sibs } = p.found;
  return (
    <nav className={s.wrap} aria-label={p.label} data-vt="tabs">
      <ul className={s.tabs} ref={row}>
        {sibs.map((a) => {
          const r = routeOf(a, c);
          return (
            <li key={a.id}>
              <a className={s.tab} href={hrefOf(r.section, ...(r.rest ?? []))}
                aria-current={a.id === at.id ? "page" : undefined}>
                {shortOf(a, lang)}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
