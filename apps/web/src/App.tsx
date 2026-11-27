import { lazy, Suspense, useCallback, useEffect, useRef, useState,
  type ComponentType } from "react";
import { documentTitle } from "./brand";
import { showArabic } from "./demo/flags";
import { navigate, useRoute } from "./demo/route";
import { useDemo } from "./demo/state";
import { useLocale } from "./i18n/LocaleProvider";
import { CommandPalette, usePaletteHotkeys } from "./shell/CommandPalette";
import { GroupTabs } from "./shell/GroupTabs";
import { Outside } from "./shell/Outside";
import { PhoneTabs, TopBar } from "./shell/TopBar";
import { mayOpen } from "./nav/registry";
import { startPrefetch } from "./demo/prefetch";
import { VIEWS } from "./views";
import { markOpeningSeen, opensAtFirstLoad, useWelcome }
  from "./welcome/route";
import s from "./App.module.css";

/** The opening's chunk did not load: go straight to the product. */
function NoOpening(p: { onDone: (() => void) | undefined }) {
  const { onDone } = p;
  useEffect(() => {
    if (onDone !== undefined) onDone();
    else location.hash = "#/home";
  }, [onDone]);
  return null;
}

/** Before the opening's chunk arrives: its paper, and Skip in the
 * same place as the film's own, from the very first frame. */
function OpeningCover(p: { label: string; onSkip(): void }) {
  return (
    <div className={s.cover}>
      <button type="button" className={s.skip} onClick={p.onSkip}>
        {p.label}
      </button>
    </div>
  );
}

/** The opening (#/welcome): three.js and its scenes load only here. */
type OpeningProps = { onDone: (() => void) | undefined };
const Welcome = lazy<ComponentType<OpeningProps>>(() =>
  import("./welcome/Welcome").catch(() => ({ default: NoOpening })));

/** The longest the product waits, inert, under the first opening:
 * the film is about 8.5 s; past this it shows whatever happened. */
export const OPENING_CAP_MS = 14000;

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
    // Fail-open: a film that hangs (a stuck chunk, a lost GPU that
    // never says so) never leaves the product inert under it.
    const cap = setTimeout(end, OPENING_CAP_MS);
    return () => {
      clearTimeout(cap);
      removeEventListener("hashchange", end);
    };
  }, [first]);
  const welcome = atWelcome || first;
  /* Report and pay run chunks load ahead, once the opening is over. */
  useEffect(() => {
    if (!welcome && import.meta.env.MODE !== "test") startPrefetch();
  }, [welcome]);
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
        <Suspense fallback={<OpeningCover label={t("welcome.skip")}
          onSkip={() => navigate("home")} />}>
          <Welcome onDone={undefined} />
        </Suspense>
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
        <Suspense fallback={<OpeningCover label={t("welcome.skip")}
          onSkip={() => setFirst(false)} />}>
          <Welcome onDone={() => setFirst(false)} />
        </Suspense>
      )}
      {paletteEl}
    </>
  );
}
