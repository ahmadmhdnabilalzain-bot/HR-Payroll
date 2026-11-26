import { useEffect, useId, useRef, useState } from "react";
import { useLocale } from "../../i18n/LocaleProvider";
import { Icon } from "../Icon";
import s from "./templates.module.css";

export interface MenuItem {
  label: string;
  onSelect(): void;
  disabled?: boolean;
  /** Why it is disabled, said under the item. */
  hint?: string;
}

/**
 * The "..." menu on a page head: secondary page actions (download,
 * print) live here, so a page shows at most one filled button. Arrow
 * keys move, Esc closes and returns focus.
 */
export function MoreMenu(p: { items: MenuItem[]; label?: string }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const items = (): HTMLButtonElement[] => Array.from(
    list.current?.querySelectorAll<HTMLButtonElement>(
      "button:not(:disabled)") ?? []);
  useEffect(() => {
    if (!open) return;
    items()[0]?.focus();
    const away = (e: PointerEvent): void => {
      const n = e.target as Node;
      if (!list.current?.contains(n) && !btn.current?.contains(n)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);
  const close = (): void => {
    setOpen(false);
    btn.current?.focus();
  };
  return (
    <div className={s.menuWrap}>
      <button ref={btn} type="button" className={s.moreBtn}
        aria-haspopup="menu" aria-expanded={open} aria-controls={id}
        aria-label={p.label ?? t("tpl.more")}
        onClick={() => setOpen((o) => !o)}>
        <Icon name="more" size={20} />
      </button>
      {open && (
        <ul ref={list} id={id} role="menu" className={s.menu}
          aria-label={p.label ?? t("tpl.more")}
          onKeyDown={(e) => {
            const all = items();
            const at = all.indexOf(document.activeElement as
              HTMLButtonElement);
            if (e.key === "Escape") { e.preventDefault(); close(); }
            if (e.key === "Tab") setOpen(false);
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              const step = e.key === "ArrowDown" ? 1 : -1;
              all[(at + step + all.length) % all.length]?.focus();
            }
          }}>
          {p.items.map((x) => (
            <li key={x.label} role="none">
              <button type="button" role="menuitem" disabled={x.disabled}
                onClick={() => { close(); x.onSelect(); }}>
                <span>{x.label}</span>
                {x.disabled === true && x.hint !== undefined && (
                  <small>{x.hint}</small>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
