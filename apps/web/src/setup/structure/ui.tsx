import type { ReactNode } from "react";
import { PageHead } from "../../ui/templates";
import { useDemo } from "../../demo/state";
import { useLocale } from "../../i18n/LocaleProvider";
import s from "./structure.module.css";

export type Tone = "ok" | "warn" | "danger" | "none";

/** Status is a word and an 8 px dot, never colour alone. */
export function Status(p: { tone: Tone; children: ReactNode }) {
  return (
    <span className={s.status}>
      <span className={s.dot} data-tone={p.tone} aria-hidden="true" />
      <span>{p.children}</span>
    </span>
  );
}

export interface RowSpec {
  key: string;
  title: ReactNode;
  help?: ReactNode;
  value?: ReactNode;
}

/** An inset grouped list; the same look as the settings template. */
export function Rows(p: { label: string; rows: RowSpec[];
  empty?: string }) {
  if (p.rows.length === 0) {
    return <p className={s.note}>{p.empty ?? "Nothing here yet."}</p>;
  }
  return (
    <ul className={s.list} aria-label={p.label}>
      {p.rows.map((r) => (
        <li key={r.key} className={s.row}>
          <span className={s.text}>
            <span>{r.title}</span>
            {r.help !== undefined && <small>{r.help}</small>}
          </span>
          {r.value !== undefined && (
            <span className={s.value}>{r.value}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function Loading() {
  const { t } = useLocale();
  return <p className={s.loading} role="status">{t("reports.loading")}</p>;
}

/** IT opens Setup but never sees anyone's pay (DEMO.md, WP10). */
export function useMaySeePay(): boolean {
  return useDemo().state.role !== "it";
}

export function NotFound(p: { back: string; label: string }) {
  return (
    <PageHead title="Not found"
      lede="There is no setup page at that address."
      back={{ label: p.label, href: p.back }} />
  );
}
