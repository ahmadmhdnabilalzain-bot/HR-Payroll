import type { Lang } from "../i18n/types";

export type ThemePref = "light" | "dark" | "system";

/** The only things kept in localStorage: language and theme. */
export interface Prefs {
  lang: Lang | null;
  theme: ThemePref | null;
}

const KEY = "prefs";
const EMPTY: Prefs = { lang: null, theme: null };

const isLang = (v: unknown): v is Lang => v === "en" || v === "ar";
const isTheme = (v: unknown): v is ThemePref =>
  v === "light" || v === "dark" || v === "system";

/** Storage can be blocked or hold junk: both give empty prefs. */
export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return EMPTY;
    const v = JSON.parse(raw) as Record<string, unknown>;
    return {
      lang: isLang(v["lang"]) ? v["lang"] : null,
      theme: isTheme(v["theme"]) ? v["theme"] : null,
    };
  } catch {
    return EMPTY;
  }
}

export function savePrefs(p: Prefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Blocked storage: the choice lasts until reload, nothing breaks.
  }
}
