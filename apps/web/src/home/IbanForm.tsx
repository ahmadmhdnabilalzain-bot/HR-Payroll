import { useId, useState, type FormEvent } from "react";
import { useLocale } from "../i18n/LocaleProvider";
import b from "../ui/button.module.css";
import s from "./IssueList.module.css";

/** UAE IBAN shape: AE, then 21 digits. Spaces are allowed while typing. */
export function isUaeIban(raw: string): boolean {
  return /^AE\d{21}$/.test(raw.replace(/\s+/g, "").toUpperCase());
}

/** Groups of four, as printed on a bank letter. */
export function groupIban(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ")
    .trim();
}

export function IbanForm(p: { name: string; onSave(): void;
  onCancel(): void }) {
  const { t } = useLocale();
  const id = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    if (isUaeIban(value)) p.onSave();
    else setError(true);
  };
  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <label className={s.formLabel} htmlFor={id}>
        {t("home.ibanLabel", { name: p.name })}
      </label>
      <div className={s.formRow}>
        <input id={id} className={s.input} value={value} dir="ltr"
          autoComplete="off" spellCheck={false} inputMode="text"
          autoFocus aria-invalid={error}
          aria-describedby={`${id}-help`}
          onChange={(e) => {
            setValue(groupIban(e.target.value).slice(0, 29));
            setError(false);
          }} />
        <button type="submit" className={`${b.btn} ${b.primary}`}>
          {t("home.save")}
        </button>
        <button type="button" className={`${b.btn} ${b.quiet}`}
          onClick={p.onCancel}>{t("home.cancel")}</button>
      </div>
      <p id={`${id}-help`} className={error ? s.error : s.help}
        role={error ? "alert" : undefined}>
        {error ? t("home.ibanError") : t("home.ibanHelp")}
      </p>
    </form>
  );
}
