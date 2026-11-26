import { useEffect, useRef, useState, type FormEvent, type ReactNode }
  from "react";
import type { Who } from "../../demo/files-state";
import { useDemo, type Role } from "../../demo/state";
import { personFor } from "../../demo/time-off";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../../ui/button.module.css";
import { Sheet } from "../../ui/templates";
import t from "../../ui/templates/templates.module.css";
import { dayText } from "../words";

/** The person the current role stands for, and the demo's date. */
export function useActor() {
  const { data, state } = useDemo();
  const id = personFor(data, state.role);
  const p = data.people.person(id);
  const who: Who = { by: id, role: state.role, on: data.files.asOf };
  return { id, role: state.role, name: p?.name.en ?? "",
    title: p?.role.en ?? "", on: data.files.asOf, who };
}

/** Names from the people data, in the shown language. */
export function useNames() {
  const { data } = useDemo();
  const { lang } = useLocale();
  return {
    name: (id: string): string => data.people.person(id)?.name[lang] ?? id,
    title: (id: string): string => data.people.person(id)?.role[lang] ?? "",
    day: (iso: string): string => dayText(iso, lang),
    /** "Fatima Al Ketbi, HR manager, 27 October". */
    by: (id: string, on: string): string => {
      const p = data.people.person(id);
      return `${p?.name[lang] ?? id}, ${p?.role[lang] ?? ""}, ` +
        dayText(on, lang);
    },
  };
}

export const ROLE_WORD: Record<Role, string> = { hr: "HR manager",
  gm: "General manager", manager: "Manager", employee: "Employee",
  it: "IT manager" };

/**
 * A side sheet with a plain form (no approval route): fields are the
 * children, `onSubmit` returns an error sentence or null.
 */
export function SheetForm(p: { open: boolean; title: string;
  submitLabel: string; onClose(): void; onSubmit(): string | null;
  children: ReactNode; note?: string }) {
  const [error, setError] = useState<string | null>(null);
  const was = useRef(p.open);
  useEffect(() => {
    if (p.open && !was.current) setError(null);
    was.current = p.open;
  }, [p.open]);
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    const err = p.onSubmit();
    if (err === null) p.onClose();
    else setError(err);
  };
  return (
    <Sheet open={p.open} title={p.title} onClose={p.onClose}>
      <form className={t.form} onSubmit={submit} noValidate>
        {p.children}
        {p.note !== undefined && <p className={t.route}>{p.note}</p>}
        {error !== null && <p className={t.error} role="alert">{error}</p>}
        <div className={t.formActions}>
          <button type="submit" className={`${b.btn} ${b.primary}`}>
            {p.submitLabel}</button>
          <button type="button" className={`${b.btn} ${b.quiet}`}
            onClick={p.onClose}>Cancel</button>
        </div>
      </form>
    </Sheet>
  );
}

/** A labelled field in a SheetForm (label wraps the control). */
export function Field(p: { label: string; help?: string;
  children: ReactNode }) {
  return (
    <label className={t.field}>
      <span>{p.label}</span>
      {p.children}
      {p.help !== undefined && <small>{p.help}</small>}
    </label>
  );
}
