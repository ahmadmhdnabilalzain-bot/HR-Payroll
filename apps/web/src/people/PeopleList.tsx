import { useId, useMemo, useState, type CSSProperties } from "react";
import type { Person } from "../demo/data/people-types";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { visibleIds } from "../demo/time-off";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import { attentionIds } from "./attention";
import { filterPeople, shortBranch } from "./filter";
import { Picker } from "./Picker";
import { statusLong, statusTone, statusWord } from "./words";
import p from "./page.module.css";
import s from "./PeopleList.module.css";
import { Avatar } from "../ui/Avatar";

/** Rows past this one appear together: a stagger, not a parade. */
const STAGGER_ROWS = 6;

type Segment = "all" | "attention" | "leavers";

/**
 * Who works here: one grouped list, sorted by name, with a segmented
 * filter (all, needs attention, leavers), a search and a department
 * picker. Status shows only when it is not "Active".
 */
export function PeopleList() {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState<string | null>(null);
  const [seg, setSeg] = useState<Segment>("all");
  const searchId = useId();
  const mine = useMemo(() => {
    const ids = new Set(visibleIds(data, state));
    return data.people.people().filter((x) => ids.has(x.id));
  }, [data, state]);
  const needs = attentionIds(data, state);
  const bySeg: Record<Segment, Person[]> = {
    all: mine,
    attention: mine.filter((x) => needs.has(x.id)),
    leavers: mine.filter((x) => x.status === "left"),
  };
  const shown = filterPeople(bySeg[seg], query, dept);
  const team = state.role === "manager";
  const depts = data.people.departments().filter((d) =>
    mine.some((x) => x.departmentId === d.id));
  const segs: [Segment, string][] = [
    ["all", t("people.segAll", { count: bySeg.all.length })],
    ["attention", t("people.segAttention",
      { count: bySeg.attention.length })],
    ["leavers", t("people.segLeavers", { count: bySeg.leavers.length })],
  ];
  return (
    <div className={p.page}>
      <header className={p.header}>
        <h1 className={p.title}>
          {team ? t("people.titleTeam") : t("people.title")}
        </h1>
      </header>
      <section className={s.list} aria-labelledby="people-results">
        <h2 id="people-results" className="visually-hidden">
          {t("people.title")}
        </h2>
        <div className={s.tools}>
          <div className={s.segments} role="radiogroup"
            aria-label={t("people.segLabel")}>
            {segs.filter(([k]) => k === "all" ||
              bySeg[k].length > 0).map(([k, label]) => (
              <button key={k} type="button" role="radio"
                aria-checked={seg === k} className={s.segment}
                onClick={() => setSeg(k)}>{label}</button>
            ))}
          </div>
          <div className={s.filters} role="search">
            <label className={s.searchBox} htmlFor={searchId}>
              <span className="visually-hidden">{t("people.search")}</span>
              <Icon name="search" size={18} />
              <input id={searchId} type="search" className={s.input}
                value={query} autoComplete="off" spellCheck={false}
                placeholder={t("people.searchPlaceholder")}
                onChange={(e) => setQuery(e.target.value)} />
            </label>
            {depts.length > 1 && (
              <Picker label={t("people.department")} value={dept ?? ""}
                onChange={(v) => setDept(v === "" ? null : v)}
                options={[{ value: "", label: t("people.allDepartments") },
                  ...depts.map((d) => ({ value: d.id,
                    label: d.name[lang] }))]} />
            )}
          </div>
        </div>
        <p className={s.count} aria-live="polite">
          {shown.length === bySeg[seg].length
            ? t("people.count", { count: shown.length })
            : t("people.countShown", { shown: shown.length,
              total: bySeg[seg].length })}
        </p>
        {shown.length === 0 ? (
          <div className={p.empty}>
            <p>{query.trim() === "" ? t("people.emptyDept")
              : t("people.empty", { query: query.trim() })}</p>
            <button type="button" className={s.clear}
              onClick={() => {
                setQuery("");
                setDept(null);
                setSeg("all");
              }}>{t("people.clear")}</button>
          </div>
        ) : (
          <ul className={s.group}>
            {shown.map((x, i) => <Row key={x.id} x={x} i={i}
              flagged={needs.has(x.id)} />)}
          </ul>
        )}
      </section>
    </div>
  );
}

const delay = (i: number) => ({ "--i": Math.min(i, STAGGER_ROWS) }) as
  CSSProperties;

/** One person: a single link row (wide: columns; phone: stacked). */
function Row(q: { x: Person; i: number; flagged: boolean }) {
  const { lang, t } = useLocale();
  const x = q.x;
  return (
    <li className={s.row} style={delay(q.i)}>
      <a className={s.link} href={hrefOf("people", x.id)}>
        <Avatar id={x.id} name={x.name.en} />
        <span className={s.who}>
          <span className={s.name}>{x.name[lang]}</span>
          <span className={`${s.number} tabular`}>{x.number}</span>
        </span>
        <span className={s.role}>{x.role[lang]}</span>
        <span className={s.soft}>{x.department[lang]}</span>
        <span className={s.soft}>{shortBranch(x.branch[lang])}</span>
        <span className={s.state}>
          {q.flagged && (
            <span className={s.flag} title={t("people.segAttentionShort")}>
              <span className="visually-hidden">
                {t("people.segAttentionShort")}
              </span>
            </span>
          )}
          {x.status !== "active" && (
            <span className={p.status} data-tone={statusTone(x)}
              title={statusLong(x, t, lang)}>{statusWord(x, t)}</span>
          )}
        </span>
        <span className={s.chev} aria-hidden="true">
          <Icon name="chevronEnd" size={16} />
        </span>
      </a>
    </li>
  );
}
