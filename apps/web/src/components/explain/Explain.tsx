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
import { Money } from "../../ui/Money";
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
  const origin = useRef<DOMRect | null>(null);
  if (p.explanation === undefined) return <>{p.children}</>;
  return (
    <>
      <button ref={btn} type="button" aria-haspopup="dialog"
        className={`${s.trigger} ${p.className ?? ""}`}
        onClick={() => {
          origin.current = btn.current?.getBoundingClientRect() ?? null;
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

/** A text link that opens an explanation ("How this is worked out"). */
export function ExplainLink(p: { explanation: Explanation | undefined;
  children: ReactNode; className?: string | undefined }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const origin = useRef<DOMRect | null>(null);
  if (p.explanation === undefined) return null;
  return (
    <>
      <button ref={btn} type="button" aria-haspopup="dialog"
        className={`${s.link} ${p.className ?? ""}`}
        onClick={() => {
          origin.current = btn.current?.getBoundingClientRect() ?? null;
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

/** The flight's curve: quick to leave, long settle. */
const OPEN_EASE = "cubic-bezier(.2,.8,.2,1)";
/** The tapped figure flies into the drawer header over this long. */
export const FLIGHT_MS = 380;
/** Reduced motion: the drawer only fades, in and out. */
export const FADE_MS = 120;
/** Closing: the drawer slides back out. */
const CLOSE_MS = 200;

/**
 * The drawer opens from the figure: the tapped figure flies from where
 * it was into the drawer header (380 ms) while the drawer, opaque from
 * its first frame, slides in 32 px (280 ms, CSS). The figure's start
 * is measured with the drawer already at its 32 px offset, so it
 * leaves exactly from the tapped figure and lands with the drawer.
 * Reduced motion: a 120 ms fade only. Web Animations, so the global
 * reduced-motion CSS rule cannot cut it.
 */
function openFrom(origin: DOMRect | null, el: HTMLElement | null,
  layer: HTMLElement | null): void {
  if (reducedMotion()) {
    layer?.animate([{ opacity: 0 }, { opacity: 1 }],
      { duration: FADE_MS, easing: "linear" });
    return;
  }
  if (origin === null || el === null) return;
  // Measure the figure where it lands, not mid-flight: an effect run
  // twice (React's development check) must not fly from itself.
  for (const a of el.getAnimations()) a.cancel();
  const r = el.getBoundingClientRect();
  if (r.width === 0) return;
  const zoom = Number(getComputedStyle(document.documentElement)
    .getPropertyValue("zoom")) || 1;
  const dx = (origin.left - r.left) / zoom;
  const dy = (origin.top - r.top) / zoom;
  const k = Math.min(1.4, Math.max(0.35, origin.height / r.height));
  el.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${k})`,
    transformOrigin: "0 0" },
  { transform: "none", transformOrigin: "0 0" }],
  // On a phone the sheet rises from the bottom edge in 280 ms: the
  // figure lands with it, so it never overshoots and settles back.
  { duration: phone() ? SHEET_MS : FLIGHT_MS, easing: OPEN_EASE });
}

/** The phone sheet's rise (the CSS --drawer-ms). */
const SHEET_MS = 280;

function phone(): boolean {
  return typeof matchMedia === "function" &&
    matchMedia("(max-width: 760px)").matches;
}

const FOCUSABLE = "button, [href], input, [tabindex]:not([tabindex='-1'])";

/**
 * The explain-why panel: what went in and where it came from, the
 * rules with their source and status, the working step by step, the
 * result, and what is left out. A side panel on wide screens, a sheet
 * from the bottom on phones. Escape or the scrim closes it.
 */
export function ExplainPanel(p: { explanation: Explanation;
  origin?: DOMRect | null; onClose(): void }) {
  const { t, dir } = useLocale();
  const e = p.explanation;
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const result = useRef<HTMLSpanElement>(null);
  const [leaving, setLeaving] = useState(false);
  const layer = useRef<HTMLDivElement>(null);
  const closing = useRef(false);
  const close = (): void => {
    if (closing.current) return;
    closing.current = true;
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
    openFrom(p.origin ?? null, result.current, layer.current);
    const html = document.documentElement;
    const was = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = was;
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
      data-reduced={reducedMotion()} onKeyDown={onKey}>
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
          </div>
        </div>
        <div className={s.body} tabIndex={0} role="region"
          aria-labelledby={`${id}-t`}>
          <p className={s.summary}>{e.summary}</p>
          <section aria-labelledby={`${id}-w`} className={s.section}>
            <h3 id={`${id}-w`} className={s.h3}>{t("explain.working")}</h3>
            <ol className={s.steps}>
              {e.steps.map((x, i) => (
                <li key={i} className={s.step}
                  data-limit={x.limit !== undefined}
                  style={{ "--i": Math.min(i, 10) } as object}>
                  <span className={s.stepText}>
                    {x.limit !== undefined && (
                      <span className={s.limitWord}>
                        {t("explain.limit")}
                      </span>
                    )}
                    {x.text}
                  </span>
                  {x.value !== undefined && (
                    <span className={s.stepValue}><Value v={x.value} /></span>
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
