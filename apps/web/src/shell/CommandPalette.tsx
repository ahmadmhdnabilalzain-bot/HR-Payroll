import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useSwitchRole } from "../demo/actions";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { useTheme } from "../theme/ThemeProvider";
import { Icon } from "../ui/Icon";
import { commands, matches, type Command, type Group } from "./commands";
import s from "./CommandPalette.module.css";

/** Opens on Cmd/Ctrl+K anywhere, and on "/" when not typing. */
export function usePaletteHotkeys(open: () => void): void {
  useEffect(() => {
    const on = (e: KeyboardEvent): void => {
      const typing = e.target instanceof HTMLElement &&
        (e.target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName));
      const k = e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey);
      if (k || (e.key === "/" && !typing)) {
        e.preventDefault();
        open();
      }
    };
    addEventListener("keydown", on);
    return () => removeEventListener("keydown", on);
  }, [open]);
}

export function CommandPalette(p: { open: boolean; arabicShown: boolean;
  onClose(): void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d === null) return;
    if (p.open && !d.open) d.showModal();
    if (!p.open && d.open) d.close();
  }, [p.open]);
  return (
    <dialog ref={ref} className={s.dialog} onClose={p.onClose}
      onClick={(e) => {
        if (e.target === ref.current) p.onClose();
      }}>
      {p.open && <Palette arabicShown={p.arabicShown} onClose={p.onClose} />}
    </dialog>
  );
}

const GROUPS: Group[] = ["actions", "people"];

function Palette(p: { arabicShown: boolean; onClose(): void }) {
  const { lang, t, setLang } = useLocale();
  const { data, state, dispatch } = useDemo();
  const { resolved, setPref } = useTheme();
  const switchRole = useSwitchRole();
  const [query, setQuery] = useState("");
  const [at, setAt] = useState(0);
  const listId = useId();
  const all = useMemo(() => commands({ data, state, dispatch, t, lang,
    arabicShown: p.arabicShown,
    toggleTheme: () => setPref(resolved === "dark" ? "light" : "dark"),
    toggleLang: () => setLang(lang === "en" ? "ar" : "en"), switchRole }),
  [data, state, dispatch, t, lang, p.arabicShown, resolved, setPref,
    setLang, switchRole]);
  const shown = all.filter((c) => matches(c, query));
  const pick = (c: Command | undefined): void => {
    if (c === undefined) return;
    p.onClose();
    // After the dialog has closed and handed focus back, so a command
    // that moves focus (open issue, decide) keeps it.
    requestAnimationFrame(() => requestAnimationFrame(() => c.run()));
  };
  const onKey = (e: React.KeyboardEvent): void => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = shown.length;
      if (n > 0) setAt((at + (e.key === "ArrowDown" ? 1 : n - 1)) % n);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(shown[at]);
    }
  };
  return (
    <div className={s.box} onKeyDown={onKey}>
      <div className={s.field}>
        <Icon name="search" size={18} />
        <input className={s.input} autoFocus value={query}
          placeholder={t("shell.palettePlaceholder")}
          aria-label={t("shell.paletteLabel")} role="combobox"
          aria-expanded="true" aria-controls={listId}
          aria-activedescendant={shown[at] ? `${listId}-${at}` : undefined}
          onChange={(e) => {
            setQuery(e.target.value);
            setAt(0);
          }} />
        <kbd className={s.esc}>Esc</kbd>
      </div>
      <div id={listId} role="listbox" className={s.list}
        aria-label={t("shell.paletteLabel")}>
        {shown.length === 0 && (
          <p className={s.empty}>{t("shell.paletteEmpty")}</p>
        )}
        {GROUPS.map((g) => {
          const items = shown.filter((c) => c.group === g);
          if (items.length === 0) return null;
          return (
            <div key={g} role="group" aria-label={g === "actions"
              ? t("shell.groupActions") : t("shell.groupPeople")}>
              <p className={s.group} aria-hidden="true">
                {g === "actions" ? t("shell.groupActions")
                  : t("shell.groupPeople")}
              </p>
              {items.map((c) => {
                const i = shown.indexOf(c);
                return (
                  <div key={c.id} id={`${listId}-${i}`} role="option"
                    aria-selected={i === at} className={s.item}
                    onMouseMove={() => setAt(i)} onClick={() => pick(c)}>
                    <Icon name={c.icon} />
                    <span className={s.label}>{c.label}</span>
                    {c.hint !== "" && <span className={s.hint}>{c.hint}</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      <div className={s.foot} aria-hidden="true">
        <span><kbd>↑</kbd><kbd>↓</kbd>{t("shell.keyMove")}</span>
        <span><kbd>↵</kbd>{t("shell.keyOpen")}</span>
        <span><kbd>Esc</kbd>{t("shell.keyClose")}</span>
      </div>
    </div>
  );
}
