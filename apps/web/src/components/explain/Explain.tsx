import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { DUR, reducedMotion } from "../../demo/motion";
import type { MessageKey } from "../../i18n/t";
import { useLocale } from "../../i18n/LocaleProvider";
import { Icon } from "../../ui/Icon";
import { Money } from "../../ui/Money";
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

function Value(p: { v: ExplainValue; size?: "lg" | "md" }) {
  return p.v.kind === "money"
    ? <Money value={p.v.fils} size={p.size ?? "md"} tween={false} />
    : <span className={s.textValue}>{p.v.text}</span>;
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

const OPEN_EASE = "cubic-bezier(.32,.72,0,1)";

/**
 * The panel opens from the figure: its result flies from where the
 * figure was to its place in the panel (320 ms). Reduced motion: the
 * panel fades in over 120 ms instead.
 */
function openFrom(origin: DOMRect | null, el: HTMLElement | null,
  panel: HTMLElement | null): void {
  if (reducedMotion()) {
    panel?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120 });
    return;
  }
  if (origin === null || el === null) return;
  const r = el.getBoundingClientRect();
  if (r.width === 0) return;
  const zoom = Number(getComputedStyle(document.documentElement)
    .getPropertyValue("zoom")) || 1;
  const dx = (origin.left - r.left) / zoom;
  const dy = (origin.top - r.top) / zoom;
  el.animate([{ transform: `translate(${dx}px, ${dy}px)`, opacity: 0.6 },
    { transform: "none", opacity: 1 }],
  { duration: 320, easing: OPEN_EASE });
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
  const result = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);
  const close = (): void => {
    if (reducedMotion()) {
      p.onClose();
      return;
    }
    setLeaving(true);
    setTimeout(p.onClose, DUR.base);
  };
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>("[data-close]")
      ?.focus({ preventScroll: true });
    openFrom(p.origin ?? null, result.current, panel.current);
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
    <div className={s.layer} data-leaving={leaving} dir={dir}
      onKeyDown={onKey}>
      <div className={s.scrim} onClick={close} aria-hidden="true" />
      <div ref={panel} className={s.panel} role="dialog" aria-modal="true"
        aria-labelledby={`${id}-t`}>
        <div className={s.head}>
          <div className={s.headText}>
            <p className={s.subject}>{e.subject}</p>
            <h2 id={`${id}-t`} className={s.title}>{e.title}</h2>
          </div>
          <button type="button" className={s.close} data-close=""
            aria-label={t("explain.close")} onClick={close}>
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className={s.body} tabIndex={0} role="region"
          aria-labelledby={`${id}-t`}>
          <div className={s.result} ref={result}>
            <span className={s.resultLabel}>{e.result.label}</span>
            <Value v={e.result.value} size="lg" />
          </div>
          <p className={s.summary}>{e.summary}</p>
          <section aria-labelledby={`${id}-w`} className={s.section}>
            <h3 id={`${id}-w`} className={s.h3}>{t("explain.working")}</h3>
            <ol className={s.steps}>
              {e.steps.map((x, i) => (
                <li key={i} className={s.step}
                  style={{ "--i": Math.min(i, 12) } as object}>
                  <span className={s.stepText}>{x.text}</span>
                  {x.value !== undefined && (
                    <span className={s.stepValue}><Value v={x.value} /></span>
                  )}
                </li>
              ))}
            </ol>
          </section>
          {e.inputs.length > 0 && (
            <section aria-labelledby={`${id}-i`} className={s.section}>
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
            <section aria-labelledby={`${id}-r`} className={s.section}>
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
              className={`${s.section} ${s.notBox}`}>
              <h3 id={`${id}-n`} className={s.h3}>{t("explain.notDone")}</h3>
              <ul className={s.notList}>
                {e.notComputed.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </section>
          )}
          <p className={s.scope}>
            {t("explain.scope", { scope: e.scope })}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
