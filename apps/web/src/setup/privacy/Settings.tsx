import { formatDate } from "../../i18n/format";
import { SettingsPage, type ChangeLogEntry,
  type SettingsGroup } from "../../ui/templates";
import { useToast } from "../../ui/Toast";
import { READ_ONLY, monthsText, usePrivacyView } from "./common";

const TO_CONFIRM = "Sample, to confirm with counsel.";

/**
 * S26: how long each kind of record is kept, and the days to answer a
 * request. Company choices, shown as samples to confirm with counsel.
 */
export function Settings() {
  const v = usePrivacyView();
  const toast = useToast();
  const { src, state, dispatch, lang, canEdit } = v;
  const groups: SettingsGroup[] = [
    { title: "How long records are kept", items: src.categories.map((c) => ({
      key: `months:${c.id}`, label: c.name, value: monthsText(v.months[c.id]!),
      help: `${c.holds} ${TO_CONFIRM} Type a number of months.`,
      editable: canEdit })) },
    { title: "Requests from staff", items: [{ key: "days",
      label: "Days to answer a request", value: `${v.days} days`,
      help: `Counted from the day the request is logged. ${TO_CONFIRM} ` +
        "Type a number of days.", editable: canEdit }] },
  ];
  const labels = new Map(groups.flatMap((g) => g.items)
    .map((i) => [i.key, i.label]));
  const log: ChangeLogEntry[] = state.privacyEdits.map((e) => ({
    when: formatDate(e.on, lang), who: `${e.who}, ${e.role}`,
    what: e.undone ? `${e.what} (undone)` : e.what }));
  const onSave = (key: string, text: string): string | null => {
    const n = Number(text.trim().split(/\s+/)[0]);
    const isDays = key === "days";
    const max = isDays ? 90 : 180;
    if (!Number.isInteger(n) || n < (isDays ? 1 : 0) || n > max) {
      return `Type a whole number from ${isDays ? 1 : 0} to ${max}.`;
    }
    const now = isDays ? v.days : v.months[key.slice(7)];
    if (now === n) return "That is already the setting.";
    const what = isDays ? `Days to answer a request set to ${n}`
      : `${labels.get(key) ?? key} kept ${n === 0 ? "until leaving"
        : `${n} months after leaving`}`;
    const nextId = state.nextPrivacy;
    dispatch({ type: "privacy-edit", edit: { key, value: n, what,
      ...v.stamp() } });
    toast.show(`${what}.`, () => dispatch({ type: "privacy-undo",
      id: nextId }));
    return null;
  };
  return (
    <SettingsPage title="Privacy and retention"
      lede={src.notice + (canEdit ? "" : READ_ONLY)} groups={groups}
      log={log} {...(canEdit ? { onSave } : {})} />
  );
}
