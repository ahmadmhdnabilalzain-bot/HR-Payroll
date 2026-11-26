import { useMemo, useState } from "react";
import type { Person } from "../demo/data/people-types";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { visibleIds } from "../demo/time-off";
import { useLocale } from "../i18n/LocaleProvider";
import { FilterList, StatusPill, type StatusTone } from "../ui/templates";
import { attentionIds } from "./attention";
import { filterPeople, shortBranch } from "./filter";
import { Picker } from "./Picker";
import { statusLong, statusTone, statusWord, type Tone } from "./words";
import s from "./PeopleList.module.css";

/** The people's own tones, on the template's status dot. */
const TONE: Record<Tone, StatusTone> = {
  ok: "ok", info: "neutral", neutral: "neutral", warn: "warn",
  danger: "stop", done: "done",
};

/**
 * Who works here, on the list template (LF): column headers, the
 * person's initials, a segmented filter (all, needs attention,
 * leavers), a search and a department picker. Status is a dot and a
 * word, shown only when it is not plain "Active".
 */
export function PeopleList() {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const [dept, setDept] = useState<string | null>(null);
  const mine = useMemo(() => {
    const ids = new Set(visibleIds(data, state));
    return data.people.people().filter((x) => ids.has(x.id));
  }, [data, state]);
  const needs = attentionIds(data, state);
  const rows = filterPeople(mine, "", dept);
  const team = state.role === "manager";
  const depts = data.people.departments().filter((d) =>
    mine.some((x) => x.departmentId === d.id));
  const status = (x: Person) => x.status !== "active" ? (
    <span title={statusLong(x, t, lang)}>
      <StatusPill tone={TONE[statusTone(x)]}>
        {statusWord(x, t)}</StatusPill>
    </span>
  ) : needs.has(x.id) ? (
    <StatusPill tone="warn">{t("people.segAttentionShort")}</StatusPill>
  ) : null;
  return (
    <FilterList<Person>
      title={team ? t("people.titleTeam") : t("people.title")}
      rows={rows} rowKey={(x) => x.id}
      searchText={(x) => `${x.name[lang]} ${x.name.en} ${x.role[lang]} ` +
        `${x.number}`}
      searchPlaceholder={t("people.searchPlaceholder")}
      rowHref={(x) => hrefOf("people", x.id)}
      avatar={(x) => ({ id: x.id, name: x.name.en })}
      filters={depts.length > 1 && (
        <Picker label={t("people.department")} value={dept ?? ""}
          onChange={(v) => setDept(v === "" ? null : v)}
          options={[{ value: "", label: t("people.allDepartments") },
            ...depts.map((d) => ({ value: d.id, label: d.name[lang] }))]} />
      )}
      segments={[
        { id: "all", label: t("people.segAll", { count: "" }).trim(),
          match: () => true },
        { id: "attention", label: t("people.segAttentionShort"),
          match: (x) => needs.has(x.id) },
        { id: "leavers", label: t("people.segLeavers", { count: "" })
          .trim(), match: (x) => x.status === "left" },
      ]}
      columns={[
        { key: "n", label: t("people.colName"), render: (x) => (
          <span className={s.who}>
            <span>{x.name[lang]}</span>
            <span className={`${s.number} tabular`}>{x.number}</span>
          </span>) },
        { key: "r", label: t("people.colRole"), render: (x) =>
          x.role[lang] },
        { key: "d", label: t("people.colDepartment"), render: (x) =>
          x.department[lang] },
        { key: "b", label: t("people.colBranch"), render: (x) =>
          shortBranch(x.branch[lang]) },
        { key: "s", label: t("people.colStatus"), render: status },
      ]}
      empty={dept === null ? t("people.emptyAny") : t("people.emptyDept")} />
  );
}
