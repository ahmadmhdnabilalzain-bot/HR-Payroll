import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ExplainRule } from "../../demo/data/people-types";
import { DUR, reducedMotion } from "../../demo/motion";
import { useDemo } from "../../demo/state";
import type { MessageKey } from "../../i18n/t";
import { useLocale } from "../../i18n/LocaleProvider";
import { Icon } from "../../ui/Icon";
import { Money } from "../../ui/Money";
import type {
  ExplainApi,
  ExplainableProps,
  ExplainPanelProps,
  ExplainTarget,
} from "./types";
import s from "./Explain.module.css";

/*
 * TEMP implementation of the explain contract (types.ts), made by the
 * People builder because none existed on demo-web. The provider and
 * <Explainable> are the stable parts; ExplainPanel can be swapped for
 * the Explain builder's panel without touching the screens.
 */

const ExplainContext = createContext<ExplainApi | null>(null);

export function ExplainProvider(p: { children: ReactNode }) {
  const [current, setCurrent] = useState<ExplainTarget | null>(null);
  const from = useRef<HTMLElement | null>(null);
  const open = useCallback((t: ExplainTarget, el?: HTMLElement | null) => {
    from.current = el ?? null;
    setCurrent(t);
  }, []);
  const close = useCallback(() => {
    setCurrent(null);
    from.current?.focus({ preventScroll: true });
  }, []);
  const api = useMemo(() => ({ open, close, current }),
    [open, close, current]);
  return (
    <ExplainContext.Provider value={api}>
      {p.children}
      <ExplainPanel target={current} onClose={close} />
    </ExplainContext.Provider>
  );
}

export function useExplain(): ExplainApi {
  const v = useContext(ExplainContext);
  if (v === null) throw new Error("useExplain outside ExplainProvider");
  return v;
}

/** A figure that opens its explanation when pressed. */
export function Explainable(p: ExplainableProps) {
  const { t } = useLocale();
  const api = useExplain();
  const on = api.current?.traceId === p.target.traceId &&
    api.current.payslipId === p.target.payslipId;
  return (
    <button type="button" className={`${s.figure} ${p.className ?? ""}`}
      aria-haspopup="dialog" aria-expanded={on}
      aria-label={t("explain.open", { label: p.target.label })}
      onClick={(e) => api.open(p.target, e.currentTarget)}>
      {p.children}
    </button>
  );
}

const STATUS: Record<string, MessageKey> = {
  official: "explain.statusOfficial", secondary: "explain.statusSecondary",
  convention: "explain.statusConvention",
  hypothetical: "explain.statusHypothetical",
  unsourced: "explain.statusUnsourced",
};

const sentence = (x: string): string =>
  x.length === 0 ? x : x[0]!.toUpperCase() + x.slice(1);

function Rule(p: { r: ExplainRule }) {
  const { t } = useLocale();
  const key = STATUS[p.r.status];
  return (
    <li className={s.rule}>
      <span className={s.ruleName}>{sentence(p.r.name)}</span>
      <span className={s.ruleStatus}>
        {key === undefined ? p.r.status : t(key)}
      </span>
      <span className={s.ruleSource}>{p.r.source ?? t("explain.noSource")}
      </span>
    </li>
  );
}

/** A side sheet on wide screens, a bottom sheet on phones. */
export function ExplainPanel(p: ExplainPanelProps) {
  const { lang, t } = useLocale();
  const { data } = useDemo();
  const ref = useRef<HTMLDialogElement>(null);
  const [shown, setShown] = useState<ExplainTarget | null>(p.target);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const d = ref.current;
    if (d === null) return undefined;
    if (p.target !== null) {
      setShown(p.target);
      setLeaving(false);
      if (!d.open) d.showModal();
      return undefined;
    }
    if (!d.open) return undefined;
    if (reducedMotion()) {
      d.close();
      return undefined;
    }
    setLeaving(true);
    const h = setTimeout(() => {
      d.close();
      setLeaving(false);
    }, DUR.base);
    return () => clearTimeout(h);
  }, [p.target]);
  const x = shown === null ? null
    : data.people.explain(shown.payslipId, shown.traceId);
  return (
    <dialog ref={ref} className={s.sheet} data-leaving={leaving}
      aria-labelledby="explain-title" aria-describedby="explain-text"
      onCancel={(e) => {
        e.preventDefault();
        p.onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) p.onClose();
      }}>
      {x !== null && shown !== null && (
        <div className={s.body}>
          <header className={s.head}>
            <h2 id="explain-title" className={s.title}>{shown.label}</h2>
            <button type="button" className={s.close}
              aria-label={t("explain.close")} onClick={p.onClose}>
              <Icon name="x" size={20} />
            </button>
          </header>
          <div className={s.amount}>
            {x.amountFils === null
              ? <span className={s.none}>{t("explain.notComputed")}</span>
              : <Money value={x.amountFils} size="lg" tween={false} />}
          </div>
          <p id="explain-text" className={s.text}>{x.text[lang]}</p>
          <section aria-labelledby="explain-rules" className={s.rules}>
            <h3 id="explain-rules" className={s.rulesTitle}>
              {t("explain.rules")}
            </h3>
            {x.rules.length === 0
              ? <p className={s.muted}>{t("explain.noRules")}</p>
              : <ul className={s.ruleList}>
                {x.rules.map((r) => <Rule key={r.name} r={r} />)}
              </ul>}
          </section>
          <p className={s.scope}>{x.rulesScope[lang]}</p>
        </div>
      )}
    </dialog>
  );
}
