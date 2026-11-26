import { useId, useMemo, useState, type CSSProperties } from "react";
import type { Person } from "../demo/data/people-types";
import { hrefOf } from "../demo/route";
import { useDemo } from "../demo/state";
import { visibleIds } from "../demo/time-off";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import { filterPeople, shortBranch } from "./filter";
import { initials, statusLong, statusTone, statusWord } from "./words";
import p from "./page.module.css";
import s from "./PeopleList.module.css";

/** Rows past this one appear together: a stagger, not a parade. */
const STAGGER_ROWS = 6;

/** Who works here: one search, one department filter, sorted by name. */
export function PeopleList() {
  const { lang, t } = useLocale();
  const { data, state } = useDemo();
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState<string | null>(null);
  const searchId = useId();
  const deptId = useId();
  const mine = useMemo(() => {
    const ids = new Set(visibleIds(data, state));
    return data.people.people().filter((x) => ids.has(x.id));
  }, [data, state]);
  const shown = filterPeople(mine, query, dept);
  const team = state.role === "manager";
  const depts = data.people.departments().filter((d) =>
    mine.some((x) => x.departmentId === d.id));
  const total = t("people.count", { count: mine.length });
  return (
    <div className={p.page}>
      <header className={p.header}>
        <h1 className={p.title}>
          {team ? t("people.titleTeam") : t("people.title")}
        </h1>
        <p className={p.lead}>
          {shown.length === mine.length ? total
            : t("people.countShown", { shown: shown.length, total })}
        </p>
      </header>
      <section className={s.list} aria-labelledby="people-results">
        <h2 id="people-results" className="visually-hidden">
          {t("people.title")}
        </h2>
        <div className={s.tools} role="search">
          <label className={s.searchBox} htmlFor={searchId}>
            <span className="visually-hidden">{t("people.search")}</span>
            <Icon name="search" size={18} />
            <input id={searchId} type="search" className={s.input}
              value={query} autoComplete="off" spellCheck={false}
              placeholder={t("people.searchPlaceholder")}
              onChange={(e) => setQuery(e.target.value)} />
          </label>
          {depts.length > 1 && (
            <>
              <label htmlFor={deptId} className="visually-hidden">
                {t("people.department")}
              </label>
              <select id={deptId} className={s.select}
                value={dept ?? ""}
                onChange={(e) => setDept(e.target.value === "" ? null
                  : e.target.value)}>
                <option value="">{t("people.allDepartments")}</option>
                {depts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name[lang]}</option>
                ))}
              </select>
            </>
          )}
        </div>
        {shown.length === 0 ? (
          <div className={p.empty}>
            <p>{query.trim() === "" ? t("people.emptyDept")
              : t("people.empty", { query: query.trim() })}</p>
            <button type="button" className={s.clear}
              onClick={() => {
                setQuery("");
                setDept(null);
              }}>{t("people.clear")}</button>
          </div>
        ) : (
          <>
            <Table rows={shown} />
            <Rows rows={shown} />
          </>
        )}
      </section>
    </div>
  );
}

const delay = (i: number) => ({ "--i": Math.min(i, STAGGER_ROWS) }) as
  CSSProperties;

/** Wide screens: a quiet table; each row is one link to the profile. */
function Table(q: { rows: Person[] }) {
  const { lang, t } = useLocale();
  return (
    <table className={s.table}>
      <thead>
        <tr>
          <th scope="col">{t("people.colName")}</th>
          <th scope="col">{t("people.colRole")}</th>
          <th scope="col">{t("people.colDepartment")}</th>
          <th scope="col">{t("people.colBranch")}</th>
          <th scope="col">{t("people.colStatus")}</th>
          <th scope="col" className={s.num}>{t("people.colNumber")}</th>
        </tr>
      </thead>
      <tbody>
        {q.rows.map((x, i) => (
          <tr key={x.id} className={s.row} style={delay(i)}>
            <td>
              <a className={s.nameLink} href={hrefOf("people", x.id)}>
                <span className={p.avatar} aria-hidden="true">
                  {initials(x.name.en)}
                </span>
                <span className={s.name}>{x.name[lang]}</span>
              </a>
            </td>
            <td>{x.role[lang]}</td>
            <td className={s.soft}>{x.department[lang]}</td>
            <td className={s.soft}>{shortBranch(x.branch[lang])}</td>
            <td>
              <span className={p.status} data-tone={statusTone(x)}
                title={statusLong(x, t, lang)}>
                {statusWord(x, t)}
              </span>
            </td>
            <td className={`${s.num} ${s.soft} tabular`}>{x.number}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Phones: one row per person, name first, the rest underneath. */
function Rows(q: { rows: Person[] }) {
  const { lang, t } = useLocale();
  return (
    <ul className={s.rows}>
      {q.rows.map((x, i) => (
        <li key={x.id} className={s.row} style={delay(i)}>
          <a className={s.card} href={hrefOf("people", x.id)}>
            <span className={p.avatar} aria-hidden="true">
              {initials(x.name.en)}
            </span>
            <span className={s.cardMain}>
              <span className={s.name}>{x.name[lang]}</span>
              <span className={s.cardSub}>
                {x.role[lang]} · {x.department[lang]}
              </span>
              <span className={s.cardSub}>
                {shortBranch(x.branch[lang])}
              </span>
            </span>
            <span className={s.cardEnd}>
              {x.status !== "active" && (
                <span className={p.status} data-tone={statusTone(x)}>
                  {statusWord(x, t)}
                </span>
              )}
              <Icon name="chevronEnd" size={18} />
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
