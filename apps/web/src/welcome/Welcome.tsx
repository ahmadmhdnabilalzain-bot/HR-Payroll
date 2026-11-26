import type { Fils } from "@payroll/engine";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { documentTitle, PRODUCT_NAME } from "../brand";
import { navigate } from "../demo/route";
import { useDemo } from "../demo/state";
import { formatMonth, formatMoney } from "../i18n/format";
import { useLocale } from "../i18n/LocaleProvider";
import type { Palette } from "./draw";
import type { FaceWords } from "./faces";
import { storyOf, type Story } from "./story";
import { markOpeningSeen, mayPlay } from "./route";
import { StaticStory } from "./StaticStory";
import s from "./Welcome.module.css";

/** The story runs from scene 0 to END in PLAY_S seconds, holds on
 * the close for HOLD_S, then fades out: about 8.5 s in all. */
const END = 4.55;
const PLAY_S = 7.2;
const HOLD_S = 0.7;
const FADE_MS = 400;
const MASK = "•".repeat(6);

type Mode = "webgl" | "static";

/** Static (a still) on phones, coarse pointers, reduced motion, no
 * WebGL or `?static=1`; only a laptop plays the film. */
function firstMode(): Mode {
  return mayPlay() ? "webgl" : "static";
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

/**
 * The opening. `onDone` is the first load's: the film ends into the
 * page underneath. Without it (#/welcome, the replay) it ends on Home.
 */
export default function Welcome(p: { onDone: (() => void) | undefined }) {
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
  useEffect(() => markOpeningSeen(), []);
  const onDone = p.onDone;
  const [leaving, setLeaving] = useState(false);
  const done = useCallback((): void => {
    if (onDone !== undefined) onDone();
    else navigate("home");
  }, [onDone]);
  /* The film's end: a short fade, then the product. Read through a
   * ref, so a new `onDone` from the parent never restarts the film. */
  const doneRef = useRef(done);
  doneRef.current = done;
  const ended = useCallback((): void => {
    setLeaving(true);
    setTimeout(() => doneRef.current(), FADE_MS);
  }, []);
  /* At first load there is no still: if the film cannot play, the
   * product shows at once. */
  useEffect(() => {
    if (mode === "static" && onDone !== undefined) onDone();
  }, [mode, onDone]);
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
  const stage = useRef<HTMLDivElement>(null);
  const sections = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (mode !== "webgl") return undefined;
    const r = root.current;
    const host = stage.current;
    if (r === null || host === null) return undefined;
    let cancelled = false;
    let stop: (() => void) | null = null;
    void import("./stage").then((m) => m.mountStage({ root: r,
      host, canvasClass: s.canvas ?? "", cancelled: () => cancelled,
      copy: sections.current.filter((x): x is HTMLElement => x !== null),
      story, words, money, palette: palette(), end: END,
      seconds: PLAY_S, hold: HOLD_S, onEnd: ended,
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
  }, [mode, story, words, money, layout, ended]);

  const button = (
    <button type="button" className={s.open} onClick={done}>
      {t("welcome.open")}
    </button>
  );
  const skipButton = (
    <button type="button" className={s.skip} onClick={done}>
      {t("welcome.skip")}
    </button>
  );

  if (mode === "static") {
    return (
      <div ref={root} className={s.root} data-mode="static">
        {skipButton}
        <StaticStory story={story} copy={copy} words={words} money={money}
          name={PRODUCT_NAME[lang]} button={button} />
      </div>
    );
  }
  return (
    <div ref={root} className={`${s.root} ${onDone === undefined ? ""
      : s.over}`} data-mode="webgl" data-leaving={leaving ? "" : undefined}>
      {skipButton}
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
      </div>
    </div>
  );
}
