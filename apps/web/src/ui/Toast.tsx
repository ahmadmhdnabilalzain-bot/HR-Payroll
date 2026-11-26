import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useOptionalDemo } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "./Icon";
import { useMaskText } from "./mask";
import s from "./Toast.module.css";

interface ToastItem {
  id: number;
  text: string;
  undo?: () => void;
  /** The page and the role it was shown on: it belongs to them. */
  hash: string;
  role: string | null;
  shownAt: number;
}

/** A flow may show its message and then open the next page at once. */
const SAME_STEP_MS = 400;

interface Toasts {
  show(text: string, undo?: () => void): void;
}

const ToastContext = createContext<Toasts | null>(null);
const LIFETIME_MS = 5000;

/** One confirmation at a time, bottom centre, with an optional undo. */
export function ToastProvider(p: { children: ReactNode }) {
  const [item, setItem] = useState<ToastItem | null>(null);
  const role = useOptionalDemo()?.state.role ?? null;
  const show = useCallback((text: string, undo?: () => void) => {
    setItem((prev) => ({ id: (prev?.id ?? 0) + 1, text,
      ...(undo === undefined ? {} : { undo }), hash: location.hash,
      role: null, shownAt: performance.now() }));
  }, []);
  // A message (and its Undo) never follows the person to another page
  // or another role: an HR "IBAN saved, Undo" is not the GM's to undo.
  useEffect(() => {
    setItem((x) => x === null ? x : x.role === null ? { ...x, role }
      : x.role === role ? x : null);
  }, [role, item?.id]);
  useEffect(() => {
    const on = (): void => setItem((x) => x === null ||
      x.hash === location.hash ||
      performance.now() - x.shownAt < SAME_STEP_MS ? x : null);
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  useEffect(() => {
    if (item === null) return undefined;
    const h = setTimeout(() => setItem(null), LIFETIME_MS);
    return () => clearTimeout(h);
  }, [item]);
  const value = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={value}>
      {p.children}
      <div className={s.region} role="status" aria-live="polite">
        {item !== null && (
          <ToastView key={item.id} item={item}
            onClose={() => setItem(null)} />
        )}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView(p: { item: ToastItem; onClose(): void }) {
  const { t } = useLocale();
  const { undo } = p.item;
  // A confirmation names amounts ("Saved AED 1,200"): masked while hidden.
  const mask = useMaskText();
  return (
    <div className={s.toast}>
      <span className={s.ok}><Icon name="check" size={16} /></span>
      <span className={s.text}>{mask(p.item.text)}</span>
      {undo !== undefined && (
        <button type="button" className={s.undo} onClick={() => {
          undo();
          p.onClose();
        }}>
          <Icon name="undo" size={14} />
          {t("home.undo")}
        </button>
      )}
    </div>
  );
}

export function useToast(): Toasts {
  const v = useContext(ToastContext);
  if (v === null) throw new Error("useToast outside ToastProvider");
  return v;
}
