import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { reducedMotion } from "../../demo/motion";
import type { MessageKey } from "../../i18n/t";
import { useLocale } from "../../i18n/LocaleProvider";
import { Icon } from "../../ui/Icon";
import { useMaskText } from "../../ui/mask";
import { FLIGHT_MS as SPRING_MS, SPRING } from "../../ui/flight";
import { Money } from "../../ui/Money";
import { assembly } from "./assembly";
import type { Fils } from "@payroll/engine";
import type {
  ExplainValue,
  Explanation,
  SourceStatus,
} from "./types";
import s from "./Explain.module.css";

const STATUS: Record<SourceStatus, MessageKey> = {
  official: "explain.official",
  secondary: "explain.secondary",
  convention: "explain.convention",
  unsourced: "explain.unsourced",
};

function Value(p: { v: ExplainValue; size?: "hero" | "lg" | "md" }) {
  return p.v.kind === "money"
    ? <Money value={p.v.fils} size={p.size ?? "md"} tween={false} />
    : <span className={s.textValue}>{p.v.text}</span>;
}

/** A cap as a 6 px bar: how much of it is used, then the two figures. */
function Limit(p: { used: Fils; cap: Fils }) {
  const { t } = useLocale();
  const pct = p.cap <= 0n ? 0
    : Math.min(100, Number((p.used * 1000n) / p.cap) / 10);
  return (
    <span className={s.limit}>
      <span className={s.limitBar} aria-hidden="true">
        <span style={{ inlineSize: `${pct}%` }} />
      </span>
      <span className={s.limitText}>
        <Money value={p.used} size="sm" tween={false} />
        {" "}{t("explain.limitOf")}{" "}
        <Money value={p.cap} size="sm" tween={false} />
      </span>
    </span>
  );
}

/** Every string in an explanation through the masker, ids and
 * statuses aside; money values stay values. */
function maskStrings<T>(v: T, mask: (t: string) => string): T {
  if (typeof v === "string") return mask(v) as T;
  if (Array.isArray(v)) return v.map((x) => maskStrings(x, mask)) as T;
  if (v !== null && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, x]) =>
      [k, k === "id" || k === "status" || k === "kind" ? x
        : maskStrings(x, mask)])) as T;
  }
  return v;
}

/** Fired on window whenever an explanation opens (first-time hints). */
export const EXPLAIN_OPEN = "mubinflow:explain-open";

function announce(): void {
  dispatchEvent(new Event(EXPLAIN_OPEN));
}

/**
 * Any figure in the demo, made explainable: the figure itself is the
 * button (no hover-only affordance; a quiet dotted rule says it can be
 * opened), and it opens the explain panel beside the page.
 */
export function Explainable(p: { explanation: Explanation | undefined;
  children: ReactNode; className?: string | undefined }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  if (p.explanation === undefined) return <>{p.children}</>;
  return (
    <>
      <button ref={btn} type="button" aria-haspopup="dialog"
        className={`${s.trigger} ${p.className ?? ""}`}
        data-explain-src={p.explanation.id}
        onClick={() => {
          origin.current = btn.current;
          setOpen(true);
          announce();
        }}>
        {p.children}
        <span className="visually-hidden">
          {t("explain.open", { title: p.explanation.title })}
        </span>
      </button>
      {open && (
        <ExplainPanel explanation={p.explanation} origin={origin.current}
          onClose={() => {
          setOpen(false);
          btn.current?.focus({ preventScroll: true });
        }} />
      )}
    </>
  );
}

/**
 * The figure a text link explains, when it is on screen (the hero's
 * net pay beside "Why this number"): the flight leaves from it, not
 * from the link.
 */
function sourceOf(id: string | undefined): HTMLElement | null {
  if (id === undefined) return null;
  const el = document.querySelector<HTMLElement>(
    `[data-explain-src="${CSS.escape(id)}"]`);
  const r = el?.getBoundingClientRect();
  return r !== undefined && r.width > 0 && r.bottom > 0 &&
    r.top < innerHeight ? el ?? null : null;
}

/** A text link that opens an explanation ("How this is worked out"). */
export function ExplainLink(p: { explanation: Explanation | undefined;
  children: ReactNode; className?: string | undefined }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  if (p.explanation === undefined) return null;
  return (
    <>
      <button ref={btn} type="button" aria-haspopup="dialog"
        className={`${s.link} ${p.className ?? ""}`}
        onClick={() => {
          origin.current = sourceOf(p.explanation?.id) ?? btn.current;
          setOpen(true);
          announce();
        }}>
        {p.children}
      </button>
      {open && (
        <ExplainPanel explanation={p.explanation} origin={origin.current}
          onClose={() => {
          setOpen(false);
          btn.current?.focus({ preventScroll: true });
        }} />
      )}
    </>
  );
}

/** The tapped figure flies into the drawer header on the demo's one
 * spring and clock (ui/flight: 420 ms), as the bank moment does. */
export const FLIGHT_MS = SPRING_MS;
/** Reduced motion: the drawer only fades, in and out. */
export const FADE_MS = 120;
/** Closing: the drawer slides back out. */
const CLOSE_MS = 200;
/** The source figure, dimmed while its working is open. */
const DIM = 0.35;

/** How far an element is moved by its own running transform (the
 * drawer's slide or the sheet's rise), in viewport px. */
function shiftOf(el: Element | null, zoom: number): { x: number;
  y: number } {
  if (el === null) return { x: 0, y: 0 };
  const m = new DOMMatrix(getComputedStyle(el).transform);
  return { x: m.m41 * zoom, y: m.m42 * zoom };
}

/**
 * The drawer opens from the figure, as a true change of size: a copy
 * of the header figure leaves from the source figure at its own size
 * (the hero's 56 px: scale about 2 down to 1, by transform) and lands
 * on the header figure's final place, measured as if the drawer had
 * already arrived, in 420 ms on the shared spring. It travels in its
 * own top layer, so it never rides (or leads) the sliding drawer; the
 * header figure appears under it as it lands. The source dims to 0.35
 * while the copy is away and comes back as it lands (the page under
 * the scrim keeps its contrast). Reduced motion: a 120 ms fade only.
 * Web Animations, so a capture can seek it and the global
 * reduced-motion CSS rule cannot cut it. Phone: no copy; the figure
 * rises with the sheet.
 */
function openFrom(src: HTMLElement | null, el: HTMLElement | null,
  layer: HTMLElement | null, panel: HTMLElement | null): void {
  if (reducedMotion()) {
    layer?.animate([{ opacity: 0 }, { opacity: 1 }],
      { duration: FADE_MS, easing: "linear" });
    return;
  }
  // Phone (lighter): the sheet rises with the figure already in its
  // header; a copy crossing the rising sheet would cut through its
  // title.
  if (src === null || el === null || phone()) return;
  // Measure the figure where it lands, not mid-flight: an effect run
  // twice (React's development check) must not fly from itself.
  for (const a of el.getAnimations()) a.cancel();
  document.querySelectorAll("[data-explain-flight]")
    .forEach((n) => n.remove());
  const origin = src.getBoundingClientRect();
  const now = el.getBoundingClientRect();
  if (now.width === 0 || origin.width === 0) return;
  const zoom = Number(getComputedStyle(document.documentElement)
    .getPropertyValue("zoom")) || 1;
  const shift = shiftOf(panel, zoom);
  const end = { x: now.x - shift.x, y: now.y - shift.y };
  const k = Math.min(2.4, Math.max(0.35, origin.height / now.height));
  const wrap = document.createElement("div");
  wrap.setAttribute("aria-hidden", "true");
  wrap.dataset["explainFlight"] = "";
  wrap.className = s.result ?? "";
  wrap.dir = getComputedStyle(el).direction;
  Object.assign(wrap.style, {
    position: "fixed", inset: "0 auto auto 0", margin: "0",
    zIndex: "60", pointerEvents: "none", whiteSpace: "nowrap",
    transformOrigin: "0 0", willChange: "transform",
    color: getComputedStyle(el).color,
  });
  wrap.appendChild(el.cloneNode(true));
  document.body.appendChild(wrap);
  // Leave from the source's start corner, scaled to its height.
  const sx = (dirOf(el) === "rtl" ? origin.x + origin.width -
    now.width * k : origin.x) / zoom;
  const sy = (origin.top + (origin.height - now.height * k) / 2) / zoom;
  const travel = wrap.animate([
    { transform: `translate(${sx}px, ${sy}px) scale(${k})` },
    { transform: `translate(${end.x / zoom}px, ${end.y / zoom}px)` },
  ], { duration: FLIGHT_MS, easing: SPRING, fill: "forwards" });
  // The header figure stays hidden until the copy lands on it.
  el.animate([{ opacity: 0 }, { opacity: 0 }],
    { duration: FLIGHT_MS });
  // The source steps back in the copy's first frame (no ramp), so the
  // copy leaving it never sits on a second full-ink figure. It comes
  // back as the copy lands, so the page under the scrim keeps its full
  // contrast while the working is read.
  src.animate([{ opacity: DIM }, { opacity: DIM }],
    { duration: FLIGHT_MS });
  src.animate([{ opacity: DIM }, { opacity: 1 }],
    { duration: CLOSE_MS, delay: FLIGHT_MS, easing: "ease-out" });
  const gone = (): void => wrap.remove();
  travel.onfinish = gone;
  travel.oncancel = gone;
}

/** Brings the source figure back at once if the drawer closes while
 * the copy is still in flight. */
function undim(src: HTMLElement | null): void {
  if (src === null) return;
  for (const a of src.getAnimations()) a.cancel();
}

function dirOf(el: Element): string {
  return getComputedStyle(el).direction;
}

function phone(): boolean {
  return typeof matchMedia === "function" &&
    matchMedia("(max-width: 760px)").matches;
}

/** Where the demo banner ends on screen (0 once it has scrolled away
 * or on a phone sheet): the drawer starts below it, never over it. */
function bannerBottom(): number {
  if (phone()) return 0;
  const r = document.querySelector("[data-demo-banner]")
    ?.getBoundingClientRect();
  return r === undefined ? 0 : Math.max(0, Math.round(r.bottom));
}

const FOCUSABLE = "button, [href], input, [tabindex]:not([tabindex='-1'])";

/**
 * The explain-why panel: what went in and where it came from, the
 * rules with their source and status, the working step by step, the
 * result, and what is left out. A side panel on wide screens, a sheet
 * from the bottom on phones. Escape or the scrim closes it.
 */
export function ExplainPanel(p: { explanation: Explanation;
  origin?: HTMLElement | null; onClose(): void }) {
  const { t, dir } = useLocale();
  // Amounts written as text follow hide-amounts (and IT sees none),
  // as every other text on screen does; <Money/> masks itself.
  const e = maskStrings(p.explanation, useMaskText());
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const result = useRef<HTMLSpanElement>(null);
  const [leaving, setLeaving] = useState(false);
  const layer = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const [top] = useState(bannerBottom);
  const plan = assembly(e.steps, phone());
  const close = (): void => {
    if (closing.current) return;
    closing.current = true;
    undim(p.origin ?? null);
    if (reducedMotion()) {
      layer.current?.animate([{ opacity: 1 }, { opacity: 0 }],
        { duration: FADE_MS, easing: "linear", fill: "forwards" });
      setTimeout(done, FADE_MS);
      return;
    }
    setLeaving(true);
    // Unmount when the slide-out ends; the timer is only a fallback.
    setTimeout(done, CLOSE_MS + 120);
  };
  const gone = useRef(false);
  const done = (): void => {
    if (gone.current) return;
    gone.current = true;
    p.onClose();
  };
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>("[data-close]")
      ?.focus({ preventScroll: true });
    openFrom(p.origin ?? null, result.current, layer.current,
      panel.current);
    const html = document.documentElement;
    const was = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = was;
      if (!closing.current) undim(p.origin ?? null);
    };
  }, []);
  const onKey = (ev: ReactKeyboardEvent): void => {
    if (ev.key === "Escape") {
      ev.stopPropagation();
      close();
      return;
    }
    if (ev.key !== "Tab" || panel.current === null) return;
    const all = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = all[0];
    const last = all[all.length - 1];
    if (ev.shiftKey && document.activeElement === first) {
      ev.preventDefault();
      last?.focus();
    } else if (!ev.shiftKey && document.activeElement === last) {
      ev.preventDefault();
      first?.focus();
    }
  };
  return createPortal(
    <div ref={layer} className={s.layer} data-leaving={leaving} dir={dir}
      data-reduced={reducedMotion()} onKeyDown={onKey}
      style={{ "--banner": `${top}px` } as object}>
      <div className={s.scrim} onClick={close} aria-hidden="true" />
      <div ref={panel} className={s.panel} role="dialog" aria-modal="true"
        aria-labelledby={`${id}-t`}
        onAnimationEnd={(ev) => {
          if (leaving && ev.target === ev.currentTarget) done();
        }}>
        {/* A div, not <header>: in a portal on <body> a header would
            become a banner landmark. */}
        <div className={s.head}>
          <div className={s.headTop}>
            <div className={s.headText}>
              <p className={s.subject}>{e.subject}</p>
              <h2 id={`${id}-t`} className={s.title}>{e.title}</h2>
            </div>
            <button type="button" className={s.close} data-close=""
              aria-label={t("explain.close")} onClick={close}>
              <Icon name="x" size={20} />
            </button>
          </div>
          <div className={s.result}>
            <span className={s.resultLabel}>{e.result.label}</span>
            <span className={s.resultFigure} ref={result}>
              <Value v={e.result.value} size="hero" />
            </span>
            <span className={s.resultRule} aria-hidden="true" />
          </div>
        </div>
        <div className={s.body} tabIndex={0} role="region"
          aria-labelledby={`${id}-t`}
          style={{ "--after-steps": `${plan.after}ms` } as object}>
          <p className={s.summary}>{e.summary}</p>
          <section aria-labelledby={`${id}-w`} className={s.section}>
            <h3 id={`${id}-w`} className={s.h3}>{t("explain.working")}</h3>
            <ol className={s.steps}>
              {e.steps.map((x, i) => (
                <li key={i} className={s.step}
                  data-limit={x.limit !== undefined}
                  data-total={x.op === "total"}
                  data-check={i === plan.check}
                  style={{ "--d": `${plan.at[i] ?? 0}ms` } as object}>
                  <span className={s.stepText}>
                    {x.limit !== undefined && (
                      <span className={s.limitWord}>
                        {t("explain.limit")}
                      </span>
                    )}
                    {x.text}
                  </span>
                  {x.value !== undefined && (
                    <span className={s.stepValue}>
                      <span className={s.roll}><Value v={x.value} /></span>
                    </span>
                  )}
                  {x.limit !== undefined && <Limit {...x.limit} />}
                </li>
              ))}
            </ol>
          </section>
          {e.inputs.length > 0 && (
            <section aria-labelledby={`${id}-i`}
              className={`${s.section} ${s.after}`}>
              <h3 id={`${id}-i`} className={s.h3}>{t("explain.inputs")}</h3>
              <dl className={s.inputs}>
                {e.inputs.map((x) => (
                  <div key={x.label} className={s.input}>
                    <dt>
                      <span className={s.inputLabel}>{x.label}</span>
                      <span className={s.from}>{x.from}</span>
                    </dt>
                    <dd><Value v={x.value} /></dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          {e.rules.length > 0 && (
            <section aria-labelledby={`${id}-r`}
              className={`${s.section} ${s.after}`}>
              <h3 id={`${id}-r`} className={s.h3}>{t("explain.rules")}</h3>
              <ul className={s.rules}>
                {e.rules.map((r) => (
                  <li key={r.text} className={s.rule}>
                    <p className={s.ruleText}>{r.text}</p>
                    <p className={s.ruleMeta}>
                      <span className={s.status} data-status={r.status}>
                        <span className={s.dot} aria-hidden="true" />
                        {r.statusLabel ?? t(STATUS[r.status])}
                      </span>
                      {r.citation !== null && (
                        <span className={s.cite}>{r.citation}</span>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {e.notComputed.length > 0 && (
            <section aria-labelledby={`${id}-n`}
              className={`${s.section} ${s.notBox} ${s.after}`}>
              <h3 id={`${id}-n`} className={s.h3}>{t("explain.notDone")}</h3>
              <ul className={s.notList}>
                {e.notComputed.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </section>
          )}
          <p className={`${s.scope} ${s.after}`}>
            {t("explain.scope", { scope: e.scope })}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
