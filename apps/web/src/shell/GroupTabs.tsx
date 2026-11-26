import type { Route } from "../demo/route";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { routeOf } from "../nav/registry";
import { shortOf } from "../nav/short";
import { tabsAt } from "./groupTabs";
import s from "./GroupTabs.module.css";

/** Pages with their own step control: the pay run's four steps. */
const OWN_STEPS = /^pay-run\/(review|fix|approve|pay)$/;

/**
 * The sibling areas of the page you are on, as tabs: the panel opens a
 * group's first area and the rest of the group sits here, drawn from
 * the registry for the role. Shown only on an area's own page (not on
 * a record under it) and only when the group has more than one area.
 */
export function GroupTabs(p: { route: Route }) {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const c = { data, state };
  if (OWN_STEPS.test([p.route.section, ...p.route.rest].join("/"))) {
    return null;
  }
  const found = tabsAt(state.role, c, p.route.section, p.route.rest);
  if (found === null) return null;
  const { at, tabs: sibs } = found;
  return (
    <nav className={s.wrap} aria-label={t("shell.groupTabs")}>
      <ul className={s.tabs}>
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
