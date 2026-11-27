import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRunApproval, useSwitchRole } from "../demo/actions";
import { formatMonthName } from "../i18n/format";
import { useDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import type { MessageKey } from "../i18n/t";
import { useTheme } from "../theme/ThemeProvider";
import { navigate } from "../demo/route";
import { interpret } from "../reports/ask/interpret";
import { useAskContext } from "../reports/ask/useAsk";
import { VIEWS } from "../views";
import { areasFor, routeOf, WORD, WORD_ICON } from "../nav/registry";
import { Icon } from "../ui/Icon";
import { useModal } from "../ui/presence";
import { commands, GROUP_ORDER, ranked, type Command, type Group }
  from "./commands";
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
  const shown = useModal(ref, p.open);
  return (
    <dialog ref={ref} className={s.dialog} onClose={p.onClose}
      onClick={(e) => {
        if (e.target === ref.current) p.onClose();
      }}>
      {shown && <Palette arabicShown={p.arabicShown} onClose={p.onClose} />}
    </dialog>
  );
}

const GROUP_KEY: Record<Group, MessageKey> = { go: "shell.groupGo",
  actions: "shell.groupActions", people: "shell.groupPeople" };

function Palette(p: { arabicShown: boolean; onClose(): void }) {
  const { lang, t, setLang } = useLocale();
  const { data, state, dispatch } = useDemo();
  const { resolved, setPref } = useTheme();
  const switchRole = useSwitchRole();
  const run = useRunApproval();
  const [query, setQuery] = useState("");
  const [at, setAt] = useState(0);
  // Rows rise in one after another (20 ms apart) on opening only, not
  // on every keystroke.
  const [entering, setEntering] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setEntering(false), 400);
    return () => clearTimeout(id);
  }, []);
  const listId = useId();
  const all = useMemo(() => commands({ data, state, dispatch, t, lang,
    arabicShown: p.arabicShown,
    toggleTheme: () => setPref(resolved === "dark" ? "light" : "dark"),
    toggleLang: () => setLang(lang === "en" ? "ar" : "en"), switchRole,
    areas: areasFor(state.role).map((a) => ({ id: a.id,
      label: a.label[lang], icon: WORD_ICON[a.section],
      hint: t(WORD[a.section]), keywords: `${a.label.en} ${a.label.ar} ` +
        `${a.keywords ?? ""}`, route: routeOf(a, { data, state }) })),
    peopleShown: VIEWS.people !== undefined,
    payRunShown: VIEWS["pay-run"] !== undefined,
    timeOffShown: VIEWS["time-off"] !== undefined, run,
    month: formatMonthName(data.headline().runMonth, lang) }),
  [data, state, dispatch, t, lang, p.arabicShown, resolved, setPref,
    setLang, switchRole, run]);
  const ask = useAskContext();
  // X34: words that name a report offer to open it, set to the month
  // or cost centre named. Two words at least, so one-word searches
  // keep finding pages first.
  const asked = query.trim().split(/\s+/).length < 2 ? null
    : interpret(query, ask);
  const askCommand: Command[] = asked?.kind !== "match" ? [] : [{
    id: "ask-report", group: "actions", icon: "file",
    label: `Open ${asked.target.label}${asked.filterText === ""
      ? "" : `, ${asked.filterText}`}`,
    hint: t("shell.askHint"), keywords: "",
    run: () => navigate("reports", ...asked.rest) }];
  const shown = [...askCommand, ...ranked(all, query)];
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
        data-entering={entering}
        aria-label={t("shell.paletteLabel")}>
        {shown.length === 0 && (
          <p className={s.empty}>{t("shell.paletteEmpty")}</p>
        )}
        {GROUP_ORDER.map((g) => {
          const items = shown.filter((c) => c.group === g);
          if (items.length === 0) return null;
          return (
            <div key={g} role="group" aria-label={t(GROUP_KEY[g])}>
              <p className={s.group} aria-hidden="true">
                {t(GROUP_KEY[g])}
              </p>
              {items.map((c) => {
                const i = shown.indexOf(c);
                return (
                  <div key={c.id} id={`${listId}-${i}`} role="option"
                    aria-selected={i === at} className={s.item}
                    style={{ "--i": Math.min(i, 12) } as CSSProperties}
                    onMouseMove={() => setAt(i)} onClick={() => pick(c)}>
                    <Icon name={c.icon} />
                    <span className={s.label}>{c.label}</span>
                    {c.hint !== "" && <span className={s.hint}>{c.hint}</span>}
                    <kbd className={s.enter} aria-hidden="true">↵</kbd>
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
