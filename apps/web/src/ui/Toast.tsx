import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "./Icon";
import s from "./Toast.module.css";

interface ToastItem {
  id: number;
  text: string;
  undo?: () => void;
}

interface Toasts {
  show(text: string, undo?: () => void): void;
}

const ToastContext = createContext<Toasts | null>(null);
const LIFETIME_MS = 5000;

/** One confirmation at a time, bottom centre, with an optional undo. */
export function ToastProvider(p: { children: ReactNode }) {
  const [item, setItem] = useState<ToastItem | null>(null);
  const show = useCallback((text: string, undo?: () => void) => {
    setItem((prev) => ({ id: (prev?.id ?? 0) + 1, text,
      ...(undo === undefined ? {} : { undo }) }));
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
  return (
    <div className={s.toast}>
      <span className={s.ok}><Icon name="check" size={16} /></span>
      <span className={s.text}>{p.item.text}</span>
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
