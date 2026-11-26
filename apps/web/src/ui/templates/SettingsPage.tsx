import { useState } from "react";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../button.module.css";
import { PageHead } from "./PageHead";
import { Sheet } from "./Sheet";
import s from "./templates.module.css";

export interface Setting {
  key: string;
  label: string;
  value: string;
  help?: string;
  /** Left out: read-only (shown, not editable). */
  editable?: boolean;
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
 * ST, settings form: grouped key-value settings, an edit sheet per
 * setting, and a change log. `onSave` stores the value in the builder's
 * state and returns an error sentence or null.
 */
export function SettingsPage(p: {
  title: string;
  lede?: string;
  groups: SettingsGroup[];
  log: ChangeLogEntry[];
  onSave?(key: string, value: string): string | null;
}) {
  const { t } = useLocale();
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
              <li key={x.key} className={s.groupedRow}>
                <span className={s.rowText}>
                  <span>{x.label}</span>
                  {x.help !== undefined && <small>{x.help}</small>}
                </span>
                <span className={s.rowValue}>{x.value}</span>
                {x.editable === true && p.onSave !== undefined && (
                  <button type="button"
                    className={`${b.btn} ${b.quiet} ${s.tap}`}
                    onClick={() => {
                      setEdit(x);
                      setValue(x.value);
                      setError(null);
                    }}>{t("tpl.edit")}</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <section className={s.block} aria-label={t("tpl.changes")}>
        <h2 className={s.blockTitle}>{t("tpl.changes")}</h2>
        {p.log.length === 0 ? <p className={s.empty}>{t("tpl.noChanges")}</p>
          : (
            <ul className={s.grouped}>
              {p.log.map((x, i) => (
                <li key={i} className={s.groupedRow}>
                  <span className={s.rowText}>
                    <span>{x.what}</span><small>{x.who}</small>
                  </span>
                  <span className={s.rowValue}>{x.when}</span>
                </li>
              ))}
            </ul>
          )}
      </section>
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
    </div>
  );
}
