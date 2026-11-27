import { useId, useMemo, useState, type FormEvent } from "react";
import { useDemo } from "../demo/state";
import { groupIban } from "../home/IbanForm";
import { useLocale } from "../i18n/LocaleProvider";
import type { MessageKey } from "../i18n/t";
import b from "../ui/button.module.css";
import s from "./PayRun.module.css";

/** A UAE IBAN: AE, then 21 digits (23 characters, spaces aside). */
const IBAN_LENGTH = 23;

/**
 * What the field says while it is typed, in words: the format until
 * it is complete, then the real salary-file check's own verdict.
 */
export function ibanWords(clean: string): { key: MessageKey;
  count?: number } | null {
  if (clean === "") return { key: "home.ibanHelp" };
  const head = clean.slice(0, 2);
  if (!"AE".startsWith(head)) return { key: "payrun.ibanStart" };
  if (/\D/.test(clean.slice(2))) return { key: "payrun.ibanDigits" };
  if (clean.length < IBAN_LENGTH) {
    return { key: "payrun.ibanCount", count: clean.length };
  }
  return null;
}

/**
 * The Fix row's IBAN field, inline in the row: 360 px, monospaced and
 * grouped in fours as typed, with "Save and check" beside it and the
 * field's validity in words under it (a line whose height is kept, so
 * the row never moves as the words change). Save runs the same check
 * as Home's form (the source's tryIban) and refuses a failing IBAN.
 */
export function RowIban(p: { employeeId: string; name: string;
  onSave(value: string): void; onCancel(): void }) {
  const { lang, t } = useLocale();
  const { source, state } = useDemo();
  const id = useId();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const clean = value.replace(/\s+/g, "");
  const format = ibanWords(clean);
  // The real check, only once the IBAN is complete.
  const verdict = useMemo(() => format !== null ? null
    : source.tryIban(state.ibans, p.employeeId, clean),
  [format, source, state.ibans, p.employeeId, clean]);
  const live = error ?? (format !== null
    ? t(format.key, format.count === undefined ? undefined
      : { count: format.count })
    : verdict?.ok === true ? t("payrun.ibanOk")
      : verdict?.reason[lang] ?? "");
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    const r = source.tryIban(state.ibans, p.employeeId, clean);
    if (r.ok) p.onSave(clean);
    else setError(r.reason[lang]);
  };
  return (
    <form className={s.iban} onSubmit={submit} noValidate>
      <label className="visually-hidden" htmlFor={id}>
        {t("home.ibanLabel", { name: p.name })}
      </label>
      <div className={s.ibanRow}>
        <input id={id} className={s.ibanInput} value={value} dir="ltr"
          autoComplete="off" spellCheck={false} autoCapitalize="characters"
          inputMode="text" autoFocus aria-invalid={error !== null}
          aria-describedby={`${id}-live`}
          onChange={(e) => {
            setValue(groupIban(e.target.value).slice(0, 29));
            setError(null);
          }} />
        <button type="submit" className={`${b.btn} ${b.primary} ${s.act}`}>
          {t("home.save")}
        </button>
        <span className={s.ibanLinks}>
          <button type="button" className={`${b.btn} ${b.quiet} ${s.act}`}
            onClick={() => {
              setValue(groupIban(source.bankLetterIban(p.employeeId)));
              setError(null);
            }}>{t("home.useLetter")}</button>
          <button type="button" className={`${b.btn} ${b.quiet} ${s.act}`}
            onClick={p.onCancel}>{t("home.cancel")}</button>
        </span>
      </div>
      <p id={`${id}-live`} className={s.ibanLive}
        data-error={error !== null}
        role={error === null ? undefined : "alert"}
        aria-live={error === null ? "polite" : undefined}>
        {live}
      </p>
    </form>
  );
}
