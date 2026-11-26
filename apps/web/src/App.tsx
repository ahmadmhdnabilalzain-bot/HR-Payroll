import { lazy, Suspense, useCallback, useEffect, useRef, useState }
  from "react";
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
import { markOpeningSeen, opensAtFirstLoad, useWelcome }
  from "./welcome/route";
import s from "./App.module.css";

/** The opening (#/welcome): three.js and its scenes load only here. */
const Welcome = lazy(() => import("./welcome/Welcome"));

/** The demo shell: ribbon, slim top bar, one section, the palette. */
export function App() {
  const { lang, t, setLang } = useLocale();
  const { data, state } = useDemo();
  const route = useRoute();
  const atWelcome = useWelcome();
  /* The first load plays the opening once (HR and the GM, laptops);
   * any move to a page ends it. */
  const [first, setFirst] = useState(() =>
    opensAtFirstLoad(state.role, location.hash));
  useEffect(() => {
    if (!first) return undefined;
    markOpeningSeen();
    const end = (): void => setFirst(false);
    addEventListener("hashchange", end);
    return () => removeEventListener("hashchange", end);
  }, [first]);
  const welcome = atWelcome || first;
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
    if (welcome) return undefined;
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
  }, [home, lang, welcome]);
  const paletteEl = (
    <CommandPalette open={palette} arabicShown={arabicShown}
      onClose={() => setPalette(false)} />
  );
  if (atWelcome) {
    return (
      <>
        <Suspense fallback={null}><Welcome onDone={undefined} /></Suspense>
        {paletteEl}
      </>
    );
  }
  return (
    <>
      {/* At first load the opening plays over the product, which waits
        * underneath (inert) and shows as the film fades. */}
      <div className={s.shell} inert={first}>
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
      </div>
      {first && (
        <Suspense fallback={<div className={s.cover} />}>
          <Welcome onDone={() => setFirst(false)} />
        </Suspense>
      )}
      {paletteEl}
    </>
  );
}
