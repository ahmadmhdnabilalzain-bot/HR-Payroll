import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { documentTitle } from "../brand";
import { loadPrefs, savePrefs } from "../lib/prefs";
import { dirOf } from "./format";
import { createT, type T } from "./t";
import type { Lang } from "./types";

interface Locale {
  lang: Lang;
  dir: "ltr" | "rtl";
  t: T;
  setLang(l: Lang): void;
}

const LocaleContext = createContext<Locale | null>(null);

/** Sets `<html lang dir>` and the title; remembers the choice. */
export function LocaleProvider(p: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() =>
    loadPrefs().lang ?? "en");
  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = dirOf(lang);
    document.title = documentTitle(lang);
  }, [lang]);
  const value = useMemo<Locale>(() => ({
    lang,
    dir: dirOf(lang),
    t: createT(lang),
    setLang: (l) => {
      savePrefs({ ...loadPrefs(), lang: l });
      setLangState(l);
    },
  }), [lang]);
  return (
    <LocaleContext.Provider value={value}>{p.children}</LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  const v = useContext(LocaleContext);
  if (v === null) throw new Error("useLocale outside LocaleProvider");
  return v;
}
