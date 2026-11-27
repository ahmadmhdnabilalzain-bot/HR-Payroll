import { useState } from "react";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../button.module.css";
import { Icon } from "../Icon";
import { PageFoot } from "./PageFoot";
import { maskNode, useMaskText } from "../mask";
import { PageHead } from "./PageHead";
import { Sheet } from "./Sheet";
import { StatusPill, type StatusTone } from "./StatusPill";
import s from "./templates.module.css";

export interface Setting {
  key: string;
  label: string;
  value: string;
  help?: string;
  /** Left out: read-only (shown, not editable). */
  editable?: boolean;
  /** Read-only: where the value is managed (an "Open" link). */
  href?: string;
  /** Its link's word, "Open" by default. */
  linkLabel?: string;
  /** Read-only: the value as a short list under the label. */
  list?: string[];
  /** The value is a state: drawn as a dot and the word (StatusPill). */
  tone?: StatusTone;
}

export interface SettingsGroup {
  title: string;
  items: Setting[];
}

export interface ChangeLogEntry {
  when: string;
  who: string;
  what: string;
}

/**
 * ST, settings form: grouped key-value settings (an inset grouped list with
 * one value edge: every row keeps an action column, so values line up), an
 * edit sheet per editable setting, an "Open" link or a short list for read-
 * only ones, and a change log. `onSave` stores the value in the builder's
 * state and returns an error sentence or null.
 */
export function SettingsPage(p: {
  title: string;
  lede?: string;
  groups: SettingsGroup[];
  /** Left out: no "Changes" block (an index of areas, not settings). */
  log?: ChangeLogEntry[];
  onSave?(key: string, value: string): string | null;
}) {
  const { t } = useLocale();
  const mask = useMaskText();
  const [edit, setEdit] = useState<Setting | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className={s.page}>
      <PageHead title={p.title} lede={p.lede} />
      {p.groups.map((g) => (
        <section key={g.title} className={s.block}
          aria-label={g.title}>
          <h2 className={s.blockTitle}>{g.title}</h2>
          <ul className={s.grouped}>
            {g.items.map((x) => (
              <li key={x.key} className={`${s.groupedRow} ${s.setRow}`}>
                <span className={s.rowText}>
                  <span>{maskNode(mask, x.label)}</span>
                  {x.list !== undefined && x.list.length > 0 && (
                    <ul className={s.rowList}>
                      {x.list.map((v) => <li key={v}>{v}</li>)}
                    </ul>
                  )}
                  {x.help !== undefined && (
                    <small>{maskNode(mask, x.help)}</small>)}
                </span>
                <span className={s.rowValue}>
                  {x.tone === undefined ? maskNode(mask, x.value)
                    : <StatusPill tone={x.tone}>{x.value}</StatusPill>}
                </span>
                <span className={s.rowAct}>
                  {x.editable === true && p.onSave !== undefined ? (
                    <button type="button"
                      className={`${b.btn} ${b.quiet} ${s.tap}`}
                      onClick={() => {
                        setEdit(x);
                        setValue(x.value);
                        setError(null);
                      }}>{t("tpl.edit")}
                      <Icon name="chevronEnd" size={16} /></button>
                  ) : x.href !== undefined ? (
                    <a className={`${b.btn} ${b.quiet} ${s.tap}`}
                      href={x.href}>{x.linkLabel ?? t("tpl.open")}
                      <Icon name="chevronEnd" size={16} /></a>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {p.log !== undefined && (
      <section className={s.block} aria-label={t("tpl.changes")}>
        <h2 className={s.blockTitle}>{t("tpl.changes")}</h2>
        {p.log.length === 0 ? <p className={s.empty}>{t("tpl.noChanges")}</p>
          : (
            <ul className={s.grouped}>
              {p.log.map((x, i) => (
                <li key={i} className={`${s.groupedRow} ${s.setRow}`}>
                  <span className={s.rowText}>
                    <span>{x.what}</span><small>{x.who}</small>
                  </span>
                  <span className={s.rowValue}>{x.when}</span>
                  <span className={s.rowAct} />
                </li>
              ))}
            </ul>
          )}
      </section>
      )}
      <Sheet open={edit !== null} title={edit?.label ?? ""}
        onClose={() => setEdit(null)}>
        <form className={s.form} onSubmit={(e) => {
          e.preventDefault();
          if (edit === null || p.onSave === undefined) return;
          const err = p.onSave(edit.key, value);
          if (err === null) setEdit(null);
          else setError(err);
        }}>
          <label className={s.field}>
            <span>{edit?.label}</span>
            <input value={value} onChange={(e) => setValue(e.target.value)} />
            {edit?.help !== undefined && <small>{edit.help}</small>}
          </label>
          {error !== null && <p className={s.error} role="alert">{error}</p>}
          <div className={s.formActions}>
            <button type="submit" className={`${b.btn} ${b.primary}`}>
              {t("tpl.save")}</button>
            <button type="button" className={`${b.btn} ${b.quiet}`}
              onClick={() => setEdit(null)}>{t("tpl.cancel")}</button>
          </div>
        </form>
      </Sheet>
      <PageFoot />
    </div>
  );
}
