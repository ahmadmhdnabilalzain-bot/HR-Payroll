import type { Route } from "../demo/route";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { areasFor, routeOf } from "../nav/registry";
import { shortOf } from "../nav/short";
import s from "./GroupTabs.module.css";

const keyOf = (section: string, rest: string[] = []): string =>
  [section, ...rest].join("/");

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
  const all = areasFor(state.role);
  const here = keyOf(p.route.section, p.route.rest);
  const at = all.find((a) => {
    const r = routeOf(a, c);
    return keyOf(r.section, r.rest) === here;
  });
  if (at === undefined) return null;
  const sibs = all.filter((a) => a.section === at.section &&
    a.group === at.group);
  if (sibs.length < 2) return null;
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
