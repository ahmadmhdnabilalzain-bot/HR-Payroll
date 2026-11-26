import { useDemo } from "../../demo/state";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import {
  SettingsPage,
  type ChangeLogEntry,
  type SettingsGroup,
} from "../../ui/templates";
import { useToast } from "../../ui/Toast";
import { actorOf } from "../rules/actor";
import { useSetupMore } from "./load";
import { connectChoice } from "./state";

/**
 * S32 to S34: one settings page per connection. Nothing is connected
 * in the demo, so a switch changes only what the page says; each
 * choice records who, role and day, and the toast undoes it.
 */
export function Connect(p: { page: string }) {
  const { pages } = useSetupMore();
  const { lang } = useLocale();
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const page = pages.find((x) => x.id === p.page);
  if (page === undefined) return null;
  const actor = actorOf(data, state);
  const canEdit = state.role === "hr" || state.role === "it";
  const items = page.groups.flatMap((g) => g.items);
  const keys = new Set(items.map((i) => i.key));

  const groups: SettingsGroup[] = page.groups.map((g) => ({
    title: g.title,
    items: g.items.map((i) => {
      const mine = connectChoice(state.connectEdits, i.key);
      const ask = i.choices === null ? "" :
        ` Type one of: ${i.choices.join(", ")}.`;
      return { key: i.key, label: i.label, help: i.help + ask,
        value: mine === null ? i.value : mine.value,
        editable: canEdit && i.choices !== null };
    }),
  }));

  const log: ChangeLogEntry[] = state.connectEdits
    .filter((e) => keys.has(e.key)).map((e) => ({
      when: formatDate(e.on, lang), who: `${e.who}, ${e.role}`,
      what: e.undone ? `${e.what} (undone)` : e.what }));

  const onSave = (key: string, text: string): string | null => {
    const item = items.find((i) => i.key === key);
    if (item?.choices == null) return "Not editable.";
    const pick = item.choices.find((c) => c.toLowerCase() ===
      text.trim().toLowerCase());
    if (pick === undefined) {
      return `Type one of: ${item.choices.join(", ")}.`;
    }
    const now = connectChoice(state.connectEdits, key)?.value ?? item.value;
    if (now === pick) return "That is already the setting.";
    const what = `${item.label} set to ${pick}`;
    const nextId = state.nextConnect;
    dispatch({ type: "connect-edit", edit: { key, value: pick, what,
      who: actor.who, role: actor.role, on: actor.on } });
    toast.show(`${what}. Nothing is connected yet.`, () =>
      dispatch({ type: "connect-undo", id: nextId }));
    return null;
  };

  const lede = `${page.notice} ${page.lede}` + (canEdit ? ""
    : " You can read these; HR and IT change them.");
  return (
    <SettingsPage title={page.title} lede={lede} groups={groups} log={log}
      {...(canEdit ? { onSave } : {})} />
  );
}
