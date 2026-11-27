import { PRODUCT_NAME } from "../brand";
import { useEffect, useRef, useState } from "react";
import { hrefOf, navigate, type Route } from "../demo/route";
import { useDemo } from "../demo/state";
import { showArabic } from "../demo/flags";
import { useLocale } from "../i18n/LocaleProvider";
import { useTheme } from "../theme/ThemeProvider";
import {
  areasFor,
  barFor,
  firstRoute,
  WORD,
  WORD_ICON,
  wordOfRoute,
} from "../nav/registry";
import type { SectionId } from "../nav/types";
import { NotificationsButton } from "../home/inbox/Notifications";
import { Icon } from "../ui/Icon";
import { SectionPanel } from "./SectionPanel";
import { RoleMenu } from "./RoleMenu";
import { Wordmark } from "./Wordmark";
import s from "./TopBar.module.css";

export function Ribbon() {
  const { lang, t } = useLocale();
  const [open, setOpen] = useState(false);
  // Touch has no title tooltip: a tap on the ribbon shows the hint.
  return (
    <div
      className={s.ribbon}
      data-demo-banner=""
      title={t("shell.ribbonHint")}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onClick={() => setOpen((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen((v) => !v);
        }
      }}
    >
      <span>{t("shell.ribbon", { product: PRODUCT_NAME[lang] })}</span>
      {open ? (
        <span className={s.ribbonHint} role="status">
          {t("shell.ribbonHint")}
        </span>
      ) : null}
    </div>
  );
}

export function TopBar(p: { route: Route; onSearch(): void }) {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  return (
    <header className={s.bar} data-vt="bar">
      <Ribbon />
      <div className={s.inner}>
        <a className={s.brand} href={hrefOf("home")}>
          <Wordmark label={PRODUCT_NAME[lang]} />
        </a>
        <Words route={p.route} />
        <div className={s.tools}>
          <button type="button" className={s.search} onClick={p.onSearch}
            title={t("shell.searchHint")}
            aria-keyshortcuts="Control+K Meta+K /">
            <Icon name="search" />
            <span className={s.searchText}>{t("shell.search")}</span>
            <span className="visually-hidden">{t("shell.searchHint")}</span>
            <kbd className={s.kbd} aria-hidden="true">⌘K</kbd>
          </button>
          {/* The bell stays in the bar on a phone too. */}
          <NotificationsButton className={s.iconBtn ?? ""} />
          <span className={s.deskTools}>
            <AmountsToggle />
            <ThemeToggle />
          </span>
          {showArabic(data.arReviewed, location.search) && <LangToggle />}
          <RoleMenu />
        </div>
      </div>
    </header>
  );
}

/**
 * The bar's words (navigation map, section 1). Home is a link; every
 * other word opens its panel, and a second click goes straight to the
 * word's first area. The words come from the registry, per role.
 */
const hrefOfRoute = (r: { section: Route["section"]; rest?: string[] })
  : string => hrefOf(r.section, ...(r.rest ?? []));

function Words(p: { route: Route }) {
  const { t } = useLocale();
  const { data, state } = useDemo();
  const [open, setOpen] = useState<SectionId | null>(null);
  const btns = useRef(new Map<SectionId, HTMLButtonElement>());
  const c = { data, state };
  const here = wordOfRoute(state.role, p.route, c);
  useEffect(() => setOpen(null), [p.route, state.role]);
  return (
    <nav className={s.nav} aria-label={t("shell.sections")}>
      {barFor(state.role).map((w) => w === "home" ||
        areasFor(state.role, w).length === 1 ? (
        <a key={w} className={s.navItem} href={w === "home" ? hrefOf("home")
          : hrefOfRoute(firstRoute(state.role, w, c))}
          aria-current={here === w ? "page" : undefined}>
          {t(WORD[w])}
        </a>
      ) : (
        <button key={w} type="button" className={s.navItem}
          ref={(el) => {
            if (el !== null) btns.current.set(w, el);
          }}
          aria-expanded={open === w} aria-controls={`panel-${w}`}
          aria-current={here === w ? "page" : undefined}
          onClick={() => {
            if (open !== w) return setOpen(w);
            const r = firstRoute(state.role, w, c);
            setOpen(null);
            navigate(r.section, ...(r.rest ?? []));
          }}>
          {t(WORD[w])}
        </button>
      ))}
      {open !== null && (
        <SectionPanel section={open} label={t(WORD[open])}
          anchor={btns.current.get(open) ?? null}
          onClose={() => setOpen(null)} />
      )}
    </nav>
  );
}

/**
 * The phone bar: four tabs (Home and the next three words), each
 * opening its section page; "More" holds the rest. Search sits in the
 * header. The count of tabs never changes during a session.
 */
export function PhoneTabs(p: { route: Route }) {
  const { t } = useLocale();
  const { data, state } = useDemo();
  const words = barFor(state.role);
  const here = p.route.section === "s" ? (p.route.rest[0] ?? "more")
    : wordOfRoute(state.role, p.route, { data, state });
  return (
    <nav className={s.tabs} aria-label={t("shell.sections")}
      data-vt="phone">
      {words.slice(0, 4).map((w) => (
        <a key={w} className={s.tab} href={w === "home" ? hrefOf("home")
          : hrefOf("s", w)} aria-current={here === w ? "page" : undefined}>
          <Icon name={WORD_ICON[w]} size={22} />
          <span>{t(WORD[w])}</span>
        </a>
      ))}
      {words.length > 4 && (
        <a className={s.tab} href={hrefOf("s")}
          aria-current={here === "more" ? "page" : undefined}>
          <Icon name="more" size={22} />
          <span>{t("shell.navMore")}</span>
        </a>
      )}
    </nav>
  );
}

function AmountsToggle() {
  const { t } = useLocale();
  const { state, dispatch } = useDemo();
  const label = state.hideAmounts ? t("shell.showAmounts")
    : t("shell.hideAmounts");
  return (
    <button type="button" className={s.iconBtn} aria-label={label}
      title={label} aria-pressed={state.hideAmounts}
      onClick={() => dispatch({ type: "toggle-amounts" })}>
      <span className={s.swap} data-on={state.hideAmounts}>
        <Icon name="eye" size={18} />
        <Icon name="eyeOff" size={18} />
      </span>
    </button>
  );
}

function ThemeToggle() {
  const { t } = useLocale();
  const { resolved, setPref } = useTheme();
  const dark = resolved === "dark";
  const label = dark ? t("shell.toLight") : t("shell.toDark");
  return (
    <button type="button" className={s.iconBtn} aria-label={label}
      title={label} onClick={() => setPref(dark ? "light" : "dark")}>
      <span className={s.swap} data-on={dark}>
        <Icon name="moon" size={18} />
        <Icon name="sun" size={18} />
      </span>
    </button>
  );
}

function LangToggle() {
  const { lang, t, setLang } = useLocale();
  const next = lang === "en" ? "ar" : "en";
  return (
    <button type="button" className={s.langBtn} lang={next}
      title={t("common.language")}
      onClick={() => setLang(next)}>
      <span className={s.langLong}>
        {next === "ar" ? t("common.arabic") : t("common.english")}
      </span>
      <span className={s.langShort} aria-hidden="true">
        {next === "ar" ? "ع" : "EN"}
      </span>
    </button>
  );
}
