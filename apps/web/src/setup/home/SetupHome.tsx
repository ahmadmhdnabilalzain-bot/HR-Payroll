import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { useLocale } from "../../i18n/LocaleProvider";
import { panelOf, routeOf } from "../../nav/registry";
import { SettingsPage, type SettingsGroup } from "../../ui/templates";
import { setupSummary } from "./summary";

/**
 * Setup's first page (`#/setup`): every Setup area the role may open,
 * in its group, as one grouped list in the manner of System Settings.
 * Each row says what the area holds; a state to act on (requests
 * waiting, a connection failing, a fund to confirm) sits at the row
 * end as a dot and a word. Open goes to the area.
 */
export function SetupHome() {
  const { lang } = useLocale();
  const { data, state } = useDemo();
  const c = { data, state };
  const groups: SettingsGroup[] = panelOf(state.role, "setup")
    .map(({ group, areas }) => ({ title: group.label[lang],
      items: areas.map((a) => {
        const r = routeOf(a, c);
        const sum = setupSummary(a, c);
        const href = hrefOf(r.section, ...(r.rest ?? []));
        return sum.tone === undefined
          ? { key: a.id, label: a.label[lang], value: "", help: sum.text,
            href }
          : { key: a.id, label: a.label[lang], value: sum.text,
            tone: sum.tone, href };
      }) }));
  return (
    <SettingsPage title="Setup"
      lede="Every Setup area and where it stands. Open one to change it."
      groups={groups} />
  );
}
