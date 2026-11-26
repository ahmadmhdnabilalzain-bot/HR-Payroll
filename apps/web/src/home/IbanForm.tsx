import { useId, useState, type FormEvent } from "react";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import b from "../ui/button.module.css";
import s from "./IssueList.module.css";

/** Groups of four, as printed on a bank letter. */
export function groupIban(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ")
    .trim();
}

/**
 * Enter an IBAN; Save runs the real salary-file check on it (the data
 * package's applyIbanFix through the source) and refuses one the check
 * finds fault with, in plain words. "Fill from bank letter" types the
 * (fictional) letter's IBAN for the presenter.
 */
export function IbanForm(p: { employeeId: string; name: string;
  onSave(value: string): void; onCancel(): void }) {
  const { lang, t } = useLocale();
  const { source, state } = useDemo();
  const id = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    const clean = value.replace(/\s+/g, "");
    const r = source.tryIban(state.ibans, p.employeeId, clean);
    if (r.ok) p.onSave(clean);
    else setError(r.reason[lang]);
  };
  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <label className={s.formLabel} htmlFor={id}>
        {t("home.ibanLabel", { name: p.name })}
      </label>
      <div className={s.formRow}>
        <input id={id} className={s.input} value={value} dir="ltr"
          autoComplete="off" spellCheck={false} autoCapitalize="characters"
          autoFocus aria-invalid={error !== null}
          aria-describedby={`${id}-help`}
          onChange={(e) => {
            setValue(groupIban(e.target.value).slice(0, 29));
            setError(null);
          }} />
        <button type="submit" className={`${b.btn} ${b.primary}`}>
          {t("home.save")}
        </button>
      </div>
      <div className={s.formFoot}>
        <p id={`${id}-help`} className={error === null ? s.help : s.error}
          role={error === null ? undefined : "alert"}>
          {error ?? t("home.ibanHelp")}
        </p>
        <div className={s.formLinks}>
          <button type="button" className={`${b.btn} ${b.quiet}`}
            onClick={() => {
              setValue(groupIban(source.bankLetterIban(p.employeeId)));
              setError(null);
            }}>{t("home.useLetter")}</button>
          <button type="button" className={`${b.btn} ${b.quiet}`}
            onClick={p.onCancel}>{t("home.cancel")}</button>
        </div>
      </div>
    </form>
  );
}
