import { useCallback, useEffect, useRef, useState } from "react";
import { documentTitle } from "./brand";
import { showArabic } from "./demo/flags";
import { useRoute } from "./demo/route";
import { useDemo } from "./demo/state";
import { useLocale } from "./i18n/LocaleProvider";
import { CommandPalette, usePaletteHotkeys } from "./shell/CommandPalette";
import { GroupTabs } from "./shell/GroupTabs";
import { Outside } from "./shell/Outside";
import { PhoneTabs, TopBar } from "./shell/TopBar";
import { mayOpen } from "./nav/registry";
import { VIEWS } from "./views";
import s from "./App.module.css";

/** The demo shell: ribbon, slim top bar, one section, the palette. */
export function App() {
  const { lang, t, setLang } = useLocale();
  const { data, state } = useDemo();
  const route = useRoute();
  /* The one route guard: a deep link the role may not open. */
  const allowed = mayOpen(state.role, route);
  const shown = route.section;
  const [palette, setPalette] = useState(false);
  const open = useCallback(() => setPalette(true), []);
  usePaletteHotkeys(open);
  const View = VIEWS[shown] ?? VIEWS.home ?? (() => null);
  const arabicShown = showArabic(data.arReviewed, location.search);
  useEffect(() => {
    if (!arabicShown && lang === "ar") setLang("en");
  }, [arabicShown, lang, setLang]);
  /* The tab names the page: Home, else the page's own heading. */
  const main = useRef<HTMLElement>(null);
  const atHome = route.section === "home" && route.unknown !== true;
  const home = atHome ? t("shell.navHome") : null;
  useEffect(() => {
    const el = main.current;
    const set = (): void => {
      const page = home ?? el?.querySelector("h1")?.textContent ?? "";
      const next = documentTitle(lang, page);
      if (document.title !== next) document.title = next;
    };
    set();
    if (el === null) return undefined;
    const seen = new MutationObserver(set);
    seen.observe(el, { subtree: true, childList: true, characterData: true });
    return () => seen.disconnect();
  }, [home, lang]);
  return (
    <>
      <TopBar route={route} onSearch={open} />
      <main className={s.main} ref={main}>
        {lang === "ar" && (
          <p className={s.banner} role="note">
            {t("common.arReviewBanner")}
          </p>
        )}
        {route.unknown === true ? <Outside key="missing" missing /> : <>
          {allowed && <GroupTabs route={route} />}
          {allowed ? <View key={shown} rest={route.rest} />
          : <Outside key={`outside-${shown}`} />}
        </>}
      </main>
      <PhoneTabs route={route} />
      <CommandPalette open={palette} arabicShown={arabicShown}
        onClose={() => setPalette(false)} />
    </>
  );
}
