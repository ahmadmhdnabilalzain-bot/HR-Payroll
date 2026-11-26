import { useCallback, useEffect, useState } from "react";
import { showArabic } from "./demo/flags";
import { useRoute } from "./demo/route";
import { useDemo } from "./demo/state";
import { useLocale } from "./i18n/LocaleProvider";
import { CommandPalette, usePaletteHotkeys } from "./shell/CommandPalette";
import { PhoneTabs, TopBar } from "./shell/TopBar";
import { canOpenPayArea } from "./pay/derive";
import { VIEWS } from "./views";
import s from "./App.module.css";

/** The demo shell: ribbon, slim top bar, one section, the palette. */
export function App() {
  const { lang, t, setLang } = useLocale();
  const { data, state } = useDemo();
  const route = useRoute();
  /* Company pay is HR's and the GM's: a typed link shows Home. The
   * IT manager opens pay groups and elements (Setup pages, no pay). */
  const company = state.role === "hr" || state.role === "gm";
  const paySetup = canOpenPayArea(state.role, route.rest[0] ?? "");
  const shown = route.section === "pay-run" && !company && !paySetup
    ? "home" : route.section;
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
