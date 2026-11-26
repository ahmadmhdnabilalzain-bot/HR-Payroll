import type { ReactNode } from "react";
import s from "./templates.module.css";

/** Every template's head: title (28), an optional lede and actions. */
export function PageHead(p: { title: string; lede?: string | undefined;
  actions?: ReactNode;
  back?: { label: string; href: string } | undefined }) {
  return (
    <header className={s.head}>
      {p.back !== undefined && (
        <a className={s.back} href={p.back.href}>{p.back.label}</a>
      )}
      <div className={s.headRow}>
        <h1 className={s.title}>{p.title}</h1>
        {p.actions !== undefined && (
          <div className={s.actions}>{p.actions}</div>
        )}
      </div>
      {p.lede !== undefined && <p className={s.lede}>{p.lede}</p>}
    </header>
  );
}
