import { PRODUCT_NAME } from "./brand";
import type { ApiMode } from "./config";
import { useLocale } from "./i18n/LocaleProvider";
import type { Lang } from "./i18n/types";
import { useTheme, type ThemePref } from "./theme/ThemeProvider";
import s from "./App.module.css";

/**
 * Placeholder shell (Plan 4 Task 1). The real layout and navigation
 * wait for the owner's design concept, so this stays deliberately bare.
 */
export function App(p: { apiMode: ApiMode }) {
  const { lang, t } = useLocale();
  return (
    <>
      <header className={s.bar}>
        <span className={s.name}>{PRODUCT_NAME[lang]}</span>
        {p.apiMode === "mock" && (
          <span className={s.badge} title={t("common.sampleDataHint")}>
            {t("common.sampleData")}
          </span>
        )}
        <LangSwitch />
        <ThemeSwitch />
      </header>
      {lang === "ar" && (
        <p className={s.banner} role="note">{t("common.arReviewBanner")}</p>
      )}
      <main className={s.main}>
        <p>{t("common.building")}</p>
      </main>
    </>
  );
}

function LangSwitch() {
  const { lang, t, setLang } = useLocale();
  const opts: [Lang, string][] = [["en", t("common.english")],
    ["ar", t("common.arabic")]];
  return (
    <div className={s.group} role="group" aria-label={t("common.language")}>
      {opts.map(([value, label]) => (
        <button key={value} type="button" className={s.toggle}
          aria-pressed={lang === value} onClick={() => setLang(value)}
          lang={value}>
          {label}
        </button>
      ))}
    </div>
  );
}

function ThemeSwitch() {
  const { t } = useLocale();
  const { pref, setPref } = useTheme();
  const opts: [ThemePref, string][] = [["light", t("common.themeLight")],
    ["dark", t("common.themeDark")], ["system", t("common.themeSystem")]];
  return (
    <div className={s.group} role="group" aria-label={t("common.theme")}>
      {opts.map(([value, label]) => (
        <button key={value} type="button" className={s.toggle}
          aria-pressed={pref === value} onClick={() => setPref(value)}>
          {label}
        </button>
      ))}
    </div>
  );
}
