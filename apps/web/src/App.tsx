import { useCallback, useEffect, useState } from "react";
import { showArabic } from "./demo/flags";
import { useRoute } from "./demo/route";
import { useDemo } from "./demo/state";
import { useLocale } from "./i18n/LocaleProvider";
import { CommandPalette, usePaletteHotkeys } from "./shell/CommandPalette";
import { PhoneTabs, TopBar } from "./shell/TopBar";
import { VIEWS } from "./views";
import s from "./App.module.css";

/** The demo shell: ribbon, slim top bar, one section, the palette. */
export function App() {
  const { lang, t, setLang } = useLocale();
  const { data, state } = useDemo();
  const route = useRoute();
  /* Company pay is HR's and the GM's: a typed link shows Home. */
  const company = state.role === "hr" || state.role === "gm";
  const shown = route.section === "pay-run" && !company ? "home"
    : route.section;
  const [palette, setPalette] = useState(false);
  const open = useCallback(() => setPalette(true), []);
  usePaletteHotkeys(open);
  const View = VIEWS[shown] ?? VIEWS.home ?? (() => null);
  const arabicShown = showArabic(data.arReviewed, location.search);
  useEffect(() => {
    if (!arabicShown && lang === "ar") setLang("en");
  }, [arabicShown, lang, setLang]);
  return (
    <>
      <TopBar route={route} onSearch={open} />
      <main className={s.main}>
        {lang === "ar" && (
          <p className={s.banner} role="note">
            {t("common.arReviewBanner")}
          </p>
        )}
        <View key={shown} rest={shown === route.section ? route.rest : []} />
      </main>
      <PhoneTabs route={route} />
      <CommandPalette open={palette} arabicShown={arabicShown}
        onClose={() => setPalette(false)} />
    </>
  );
}
