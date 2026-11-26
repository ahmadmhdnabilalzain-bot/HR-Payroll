import type { Fils } from "@payroll/engine";
import { useCallback, useEffect, useMemo, useRef, useState,
  type MouseEvent } from "react";
import { documentTitle, PRODUCT_NAME } from "../brand";
import { reducedMotion } from "../demo/motion";
import { navigate } from "../demo/route";
import { useDemo } from "../demo/state";
import { formatMonth, formatMoney } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import type { Palette } from "./draw";
import type { FaceWords } from "./faces";
import { storyOf, type Story } from "./story";
import { StaticStory } from "./StaticStory";
import s from "./Welcome.module.css";

/** Scroll per scene, in viewport heights, and where the story ends. */
const PER_SCENE = 150;
const END = 4.55;
const MASK = "•".repeat(6);

type Mode = "webgl" | "static";

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return c.getContext("webgl2") !== null;
  } catch {
    return false;
  }
}

/** Static when motion is reduced, WebGL is missing, or `?static=1`. */
function firstMode(): Mode {
  const forced = new URLSearchParams(location.search).get("static") === "1";
  return forced || reducedMotion() || !hasWebGL() ? "static" : "webgl";
}

function palette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (k: string): string => css.getPropertyValue(`--color-cine-${k}`)
    .trim();
  return { ink: v("ink"), paper: v("paper"), card: v("card"),
    g200: v("grey-200"), g300: v("grey-300"), g500: v("grey-500"),
    g700: v("grey-700") };
}

export interface Copy {
  title: string;
  body: string;
  /** What the scene shows, for screen readers. */
  said: string;
}

function said(story: Story, m: (f: Fils) => string): string[] {
  const p = story.payslip;
  const fig = p.lines[p.figure];
  return [
    m(story.netFils),
    `${p.name}: ${fig?.label ?? ""} ${fig?.fils == null ? "" : m(fig.fils)}.` +
      ` ${p.steps.map((x) => x.fils === null ? x.label
        : `${x.label} ${m(x.fils)}`).join("; ")}.`,
    `${story.rows.filter((r) => r.flag !== null).map((r) =>
      `${r.name}: ${r.flag?.title ?? ""}`).join("; ")}. ` +
      `${m(story.file.beforeFils)} → ${m(story.file.afterFils)}.`,
    story.approvals.map((a) => `${a.title}, ${a.who}` +
      (a.amountFils === null ? "" : `, ${m(a.amountFils)}`)).join("; "),
    "",
  ];
}

export default function Welcome() {
  const { source, state } = useDemo();
  const { t, lang } = useLocale();
  /* Company figures follow the product's pay visibility and masking. */
  const masked = state.hideAmounts ||
    !(state.role === "hr" || state.role === "gm");
  const money = useCallback((f: Fils): string => masked
    ? `AED ${MASK}` : formatMoney(f, lang), [masked, lang]);
  const story = useMemo(() => storyOf(source, t, lang), [source, t, lang]);
  const [mode, setMode] = useState<Mode>(firstMode);
  /* Bumped when the window turns between wide and tall. */
  const [layout, setLayout] = useState(0);
  const words: FaceWords = useMemo(() => ({
    payslip: t("welcome.payslip"),
    month: formatMonth(story.runMonth, lang),
    netPay: t("welcome.netPay"), working: t("welcome.working"),
    stopsPay: t("welcome.stopsPay"), fixed: t("welcome.fixed"),
    ibanEnding: (last) => t("welcome.ibanEnding", { last }),
    checksOut: t("welcome.checksOut"), fileTotal: t("welcome.fileTotal"),
    heldIn: (amount) => t("welcome.heldIn", { amount }),
    signedOff: (name) => t("welcome.signedOff", { name }),
    signed: t("welcome.signed"),
    decisions: t("welcome.decisions") }), [t, lang, story.runMonth]);
  const spoken = said(story, money);
  const copy: Copy[] = ([1, 2, 3, 4, 5] as const).map((n, i) => ({
    title: t(`welcome.s${n}Title`), body: t(`welcome.s${n}Body`),
    said: spoken[i] ?? "" }));

  useEffect(() => {
    document.title = documentTitle(lang, t("welcome.label"));
    scrollTo({ top: 0 });
  }, [lang, t]);
  /* Turning motion off while the page is open drops to the static story. */
  useEffect(() => {
    const q = matchMedia("(prefers-reduced-motion: reduce)");
    const on = (): void => {
      if (q.matches) setMode("static");
    };
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);

  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLParagraphElement>(null);
  const open = useRef<HTMLButtonElement>(null);
  const sections = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (mode !== "webgl") return undefined;
    const r = root.current;
    const tr = track.current;
    const host = stage.current;
    if (r === null || tr === null || host === null) return undefined;
    let cancelled = false;
    let stop: (() => void) | null = null;
    void import("./stage").then((m) => m.mountStage({ root: r, track: tr,
      host, canvasClass: s.canvas ?? "", cancelled: () => cancelled,
      copy: sections.current.filter((x): x is HTMLElement => x !== null),
      hint: hint.current, story, words, money,
      palette: palette(), end: END,
      onFail: () => setMode("static"),
      onRelayout: () => setLayout((n) => n + 1) })).then((done) => {
      if (cancelled) done();
      else stop = done;
    }).catch(() => {
      if (!cancelled) setMode("static");
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [mode, story, words, money, layout]);

  const skip = (e: MouseEvent): void => {
    e.preventDefault();
    scrollTo({ top: document.documentElement.scrollHeight,
      behavior: "instant" });
    open.current?.focus({ preventScroll: true });
  };
  const toEnd = (): void => {
    if (mode !== "webgl") return;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (scrollY < max - 4) scrollTo({ top: max, behavior: "instant" });
  };
  const button = (
    <button ref={open} type="button" className={s.open} onFocus={toEnd}
      onClick={() => navigate("home")}>
      {t("welcome.open")}
    </button>
  );
  const skipLink = (
    <a className={s.skip} href="#/home" onClick={skip}>{t("welcome.skip")}</a>
  );

  if (mode === "static") {
    return (
      <div ref={root} className={s.root} data-mode="static">
        {skipLink}
        <StaticStory story={story} copy={copy} words={words} money={money}
          name={PRODUCT_NAME[lang]} button={button} />
      </div>
    );
  }
  return (
    <div ref={root} className={s.root} data-mode="webgl">
      {skipLink}
      <div ref={track} className={s.track}
        style={{ blockSize: `${END * PER_SCENE + 100}svh` }}>
        <div ref={stage} className={s.stage}>
          <h1 className="visually-hidden">{PRODUCT_NAME[lang]}</h1>
          {copy.map((c, i) => (
            <section key={c.title} ref={(el) => { sections.current[i] = el; }}
              className={`${s.copy} ${i === 0 || i === 4 ? s.centre
                : s.side} ${i === 0 ? s.first : ""} ${i === 4 ? s.last
                : ""}`} aria-label={c.title}>
              <h2 className={s.title}>{c.title}</h2>
              <p className={s.body}>{c.body}</p>
              {c.said !== "" && <p className="visually-hidden">{c.said}</p>}
              {i === 4 && button}
            </section>
          ))}
          <p ref={hint} className={s.hint}>{t("welcome.scroll")}</p>
        </div>
      </div>
    </div>
  );
}
