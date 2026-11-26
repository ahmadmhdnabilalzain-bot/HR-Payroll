import { PRODUCT_NAME } from "../brand";
import { hrefOf } from "../demo/route";
import { useDemo, type Section } from "../demo/state";
import { showArabic } from "../demo/flags";
import type { MessageKey } from "../i18n/t";
import { useLocale } from "../i18n/LocaleProvider";
import { useTheme } from "../theme/ThemeProvider";
import { Icon, type IconName } from "../ui/Icon";
import { VIEWS } from "../views";
import { RoleMenu } from "./RoleMenu";
import { Wordmark } from "./Wordmark";
import s from "./TopBar.module.css";

/** Every section in order; only those with a view are shown. Reports
 * is not in the phone bar (at most four there, plus search). */
const NAV: [Section, MessageKey, IconName][] = [
  ["home", "shell.navHome", "home"],
  ["pay-run", "shell.navPayRun", "wallet"],
  ["people", "shell.navPeople", "users"],
  ["time-off", "shell.navTimeOff", "calendar"],
  ["reports", "shell.navReports", "chart"],
];

export function Ribbon() {
  const { lang, t } = useLocale();
  return (
    <div className={s.ribbon} title={t("shell.ribbonHint")}>
      {t("shell.ribbon", { product: PRODUCT_NAME[lang] })}
    </div>
  );
}

export function TopBar(p: { section: Section; onSearch(): void }) {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  return (
    <header className={s.bar}>
      <Ribbon />
      <div className={s.inner}>
        <a className={s.brand} href={hrefOf("home")}>
          <Wordmark label={PRODUCT_NAME[lang]} />
        </a>
        <Nav section={p.section} onSearch={p.onSearch} />
        <div className={s.tools}>
          <button type="button" className={s.search} onClick={p.onSearch}
            title={t("shell.searchHint")}
            aria-keyshortcuts="Control+K Meta+K /">
            <Icon name="search" />
            <span className={s.searchText}>{t("shell.search")}</span>
            <span className="visually-hidden">{t("shell.searchHint")}</span>
            <kbd className={s.kbd} aria-hidden="true">⌘K</kbd>
          </button>
          <AmountsToggle />
          <ThemeToggle />
          {showArabic(data.arReviewed, location.search) && <LangToggle />}
          <RoleMenu />
        </div>
      </div>
    </header>
  );
}

function Nav(p: { section: Section; onSearch(): void }) {
  const { t } = useLocale();
  return (
    <nav className={s.nav} aria-label={t("shell.sections")}>
      {NAV.filter(([id]) => VIEWS[id] !== undefined).map(([id, key,
        icon]) => (
        <a key={id} href={hrefOf(id)} className={s.navItem}
          data-phone={id === "reports" ? "no" : undefined}
          aria-current={p.section === id ? "page" : undefined}>
          <Icon name={icon} size={20} />
          <span>{t(key)}</span>
        </a>
      ))}
      <button type="button" className={`${s.navItem} ${s.navSearch}`}
        onClick={p.onSearch}>
        <Icon name="search" size={20} />
        <span>{t("shell.search")}</span>
      </button>
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
