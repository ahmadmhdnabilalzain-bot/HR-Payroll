import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadPrefs, savePrefs, type ThemePref } from "../lib/prefs";

export type { ThemePref };
type Resolved = "light" | "dark";

interface Theme {
  pref: ThemePref;
  resolved: Resolved;
  setPref(p: ThemePref): void;
}

const ThemeContext = createContext<Theme | null>(null);
const DARK_QUERY = "(prefers-color-scheme: dark)";

function systemDark(): boolean {
  return typeof matchMedia === "function" && matchMedia(DARK_QUERY).matches;
}

/** Follows the system until the person picks; sets `<html data-theme>`. */
export function ThemeProvider(p: { children: ReactNode }) {
  const [pref, setPrefState] = useState<ThemePref>(() =>
    loadPrefs().theme ?? "system");
  const [dark, setDark] = useState(systemDark);
  useEffect(() => {
    if (typeof matchMedia !== "function") return undefined;
    const mq = matchMedia(DARK_QUERY);
    const on = (): void => setDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const resolved: Resolved = pref === "system" ? (dark ? "dark" : "light")
    : pref;
  useEffect(() => {
    document.documentElement.dataset["theme"] = resolved;
  }, [resolved]);
  const value = useMemo<Theme>(() => ({
    pref, resolved,
    setPref: (next) => {
      savePrefs({ ...loadPrefs(), theme: next });
      setPrefState(next);
    },
  }), [pref, resolved]);
  return (
    <ThemeContext.Provider value={value}>{p.children}</ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const v = useContext(ThemeContext);
  if (v === null) throw new Error("useTheme outside ThemeProvider");
  return v;
}
