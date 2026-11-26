import { useMemo } from "react";
import { useDemo } from "../../demo/state";
import { formatDate } from "../../i18n/format";
import { useLocale } from "../../i18n/LocaleProvider";
import {
  SettingsPage,
  type ChangeLogEntry,
  type SettingsGroup,
} from "../../ui/templates";
import { useToast } from "../../ui/Toast";
import { actorOf } from "./actor";
import { packVersions, ruleOf, STATUS_WORD } from "./data";
import { choiceOf } from "./state";

/** A number a company may choose, held to what the law allows. */
export interface Edit {
  unit: "%" | "days" | "hours";
  min?: number;
  max?: number;
  /** What the limit is, for the error: "The law gives at least". */
  why: string;
}

export interface ItemSpec {
  /** Unique on the page; also the key of a recorded choice. */
  key: string;
  label: string;
  /** A rule of the packs ("ae-time", "timeAnnualLeaveMinDays")... */
  rule?: readonly [string, string];
  /** ...or a value that comes from elsewhere in the data. */
  value?: string;
  help?: string;
  edit?: Edit;
}

export interface GroupSpec {
  title: string;
  items: ItemSpec[];
}

export interface PageSpec {
  title: string;
  lede: string;
  groups: GroupSpec[];
}

const fmt = (n: number, unit: Edit["unit"]): string =>
  unit === "%" ? `${n}%` : `${n} ${n === 1 ? unit.slice(0, -1) : unit}`;

/** "30", "30 days" or "25%" to a number; null when it is not one. */
export function parseChoice(text: string, unit: Edit["unit"])
  : number | null {
  const m = /^\s*(\d+(?:\.\d+)?)\s*(%|days?|hours?)?\s*$/i.exec(text);
  if (m === null) return null;
  const given = (m[2] ?? "").toLowerCase();
  if (given !== "" && given[0] !== unit[0]) return null;
  return Number(m[1]);
}

/** The error for a choice outside its limits, or null when it fits. */
export function limitError(n: number, e: Edit): string | null {
  if (e.min !== undefined && n < e.min) {
    return `${e.why} ${fmt(e.min, e.unit)}. Enter ${fmt(e.min, e.unit)} ` +
      "or more.";
  }
  if (e.max !== undefined && n > e.max) {
    return `${e.why} ${fmt(e.max, e.unit)}. Enter ${fmt(e.max, e.unit)} ` +
      "or less.";
  }
  return null;
}

/**
 * ST page over rule packs. A rule shows its value, its plain sentence
 * and how sure the source is. Only choices a company may make are
 * editable, only by HR, and never below what the law gives. A choice
 * is recorded with who, role and day and can be undone; it applies to
 * the coming pay months, so no October figure changes.
 */
export function RuleSettings(p: { spec: PageSpec }) {
  const { lang } = useLocale();
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const actor = actorOf(data, state);
  const items = useMemo(() => p.spec.groups.flatMap((g) => g.items),
    [p.spec]);
  const keys = new Set(items.map((i) => i.key));

  const groups: SettingsGroup[] = p.spec.groups.map((g) => ({
    title: g.title,
    items: g.items.map((i) => {
      const r = i.rule === undefined ? null : ruleOf(i.rule[0], i.rule[1]);
      const mine = choiceOf(state.ruleEdits, i.key);
      const base = i.value ?? r?.value ?? "";
      const status = r === null ? null : STATUS_WORD[r.status];
      const help = [i.help ?? r?.text, mine !== null
        ? "Your company's choice." : status].filter(Boolean).join(" ");
      return { key: i.key, label: i.label, help,
        value: mine === null || i.edit === undefined ? base
          : fmt(mine.value, i.edit.unit),
        editable: actor.canEdit && i.edit !== undefined };
    }),
  }));

  const log: ChangeLogEntry[] = [
    ...state.ruleEdits.filter((e) => keys.has(e.key)).map((e) => ({
      when: formatDate(e.on, lang), who: `${e.who}, ${e.role}`,
      what: e.undone ? `${e.what} (undone)` : e.what })),
    ...baselines(items, (iso) => formatDate(iso, lang)),
  ];

  const onSave = (key: string, text: string): string | null => {
    const item = items.find((i) => i.key === key);
    const edit = item?.edit;
    if (item === undefined || edit === undefined) return "Not editable.";
    const n = parseChoice(text, edit.unit);
    if (n === null) {
      return `Enter a number of ${edit.unit === "%" ? "per cent" : edit.unit}` +
        `, for example ${fmt(edit.min ?? edit.max ?? 1, edit.unit)}.`;
    }
    const bad = limitError(n, edit);
    if (bad !== null) return bad;
    const now = choiceOf(state.ruleEdits, key);
    const was = now === null ? null : fmt(now.value, edit.unit);
    if (was === fmt(n, edit.unit)) return "That is already the setting.";
    const what = `${item.label} set to ${fmt(n, edit.unit)}`;
    const nextId = state.nextRuleEdit;
    dispatch({ type: "rule-edit", edit: { key, value: n, what,
      who: actor.who, role: actor.role, on: actor.on } });
    toast.show(`${what}. It applies from the next pay month; October ` +
      "does not change.", () => dispatch({ type: "rule-undo",
      id: nextId }));
    return null;
  };

  const lede = actor.canEdit ? p.spec.lede
    : `${p.spec.lede} You can read these; the HR manager changes them.`;
  return (
    <SettingsPage title={p.spec.title} lede={lede} groups={groups}
      log={log} {...(actor.canEdit ? { onSave } : {})} />
  );
}

/** The packs a page reads, as the first lines of its change log. */
function baselines(items: ItemSpec[], when: (iso: string) => string)
  : ChangeLogEntry[] {
  const ids = new Set(items.flatMap((i) =>
    i.rule === undefined ? [] : [i.rule[0]]));
  return packVersions().filter((v) => ids.has(v.packId)).map((v) => ({
    when: when(v.effectiveFrom), who: "Rule pack",
    what: `${v.name}: version ${v.version} in force` }));
}
