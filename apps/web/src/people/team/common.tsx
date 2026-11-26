import type { ReactNode } from "react";
import { hrefOf } from "../../demo/route";
import { useDemo } from "../../demo/state";
import { useLocale } from "../../i18n/LocaleProvider";
import { PageHead } from "../../ui/templates";
import s from "./team.module.css";

/** Team and Growth are for HR and the General manager (map section 7). */
export function useAllowed(): boolean {
  const { state } = useDemo();
  return state.role === "hr" || state.role === "gm";
}

/** The page a manager or employee lands on from a deep link. */
export function Outside() {
  const { t } = useLocale();
  return (
    <div className={s.page}>
      <PageHead title={t("people.notVisible")}
        lede={t("people.notVisibleHint")}
        back={{ label: t("people.back"), href: hrefOf("people") }} />
    </div>
  );
}

export const teamHref = (...rest: string[]): string =>
  hrefOf("people", "team", ...rest);
export const growthHref = (...rest: string[]): string =>
  hrefOf("people", "growth", ...rest);
export const profileHref = (id: string): string => hrefOf("people", id);

export type Tone = "ok" | "warn" | "open" | "plain";

/** A status as a grey, green, amber or accent dot and a plain word. */
export function Status(p: { tone: Tone; children: ReactNode }) {
  return <span className={s.status} data-tone={p.tone}>{p.children}</span>;
}

/** A share as a thin bar; the figure beside it says the number. */
export function Progress(p: { pct: number; label: string }) {
  return (
    <span className={s.progress}>
      <span className={s.track} role="img" aria-label={p.label}>
        <i style={{ inlineSize: `${Math.min(100, Math.max(0, p.pct))}%` }} />
      </span>
      <span className="tabular">{p.label}</span>
    </span>
  );
}
