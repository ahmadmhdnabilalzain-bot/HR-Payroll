import { useId, useState, type FormEvent } from "react";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../button.module.css";
import { Sheet } from "./Sheet";
import s from "./templates.module.css";

export type FieldKind = "text" | "number" | "date" | "select" | "textarea";

export interface FormField {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  options?: { value: string; label: string }[];
  help?: string;
  initial?: string;
}

export type FormValues = Record<string, string>;

/**
 * FA, form with approval: a side sheet whose submit sends the request
 * to the approvals inbox with the maker and checker named. `onSubmit`
 * returns an error sentence, or null when the request was recorded
 * (the builder dispatches its own store action there).
 */
export function ApprovalForm(p: {
  open: boolean;
  title: string;
  fields: FormField[];
  maker: string;
  checker: string;
  submitLabel: string;
  onSubmit(values: FormValues): string | null;
  onClose(): void;
}) {
  const { t } = useLocale();
  const id = useId();
  const [values, setValues] = useState<FormValues>(() =>
    Object.fromEntries(p.fields.map((f) => [f.key, f.initial ?? ""])));
  const [error, setError] = useState<string | null>(null);
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    const missing = p.fields.find((f) => f.required === true &&
      (values[f.key] ?? "").trim() === "");
    if (missing !== undefined) {
      setError(t("tpl.required", { field: missing.label }));
      return;
    }
    const err = p.onSubmit(values);
    if (err === null) p.onClose();
    else setError(err);
  };
  const set = (k: string, v: string): void => {
    setValues({ ...values, [k]: v });
    setError(null);
  };
  return (
    <Sheet open={p.open} title={p.title} onClose={p.onClose}>
      <form className={s.form} onSubmit={submit} noValidate>
        {p.fields.map((f) => (
          <label key={f.key} className={s.field}>
            <span>{f.label}</span>
            {f.kind === "select" ? (
              <select value={values[f.key]} required={f.required}
                onChange={(e) => set(f.key, e.target.value)}>
                {(f.options ?? []).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            ) : f.kind === "textarea" ? (
              <textarea value={values[f.key]} rows={3}
                onChange={(e) => set(f.key, e.target.value)} />
            ) : (
              <input type={f.kind} value={values[f.key]}
                required={f.required}
                onChange={(e) => set(f.key, e.target.value)} />
            )}
            {f.help !== undefined && <small>{f.help}</small>}
          </label>
        ))}
        <p className={s.route} id={`${id}-route`}>
          {t("tpl.makerChecker", { maker: p.maker, checker: p.checker })}
        </p>
        {error !== null && <p className={s.error} role="alert">{error}</p>}
        <div className={s.formActions}>
          <button type="submit" className={`${b.btn} ${b.primary}`}
            aria-describedby={`${id}-route`}>{p.submitLabel}</button>
          <button type="button" className={`${b.btn} ${b.quiet}`}
            onClick={p.onClose}>{t("tpl.cancel")}</button>
        </div>
      </form>
    </Sheet>
  );
}
