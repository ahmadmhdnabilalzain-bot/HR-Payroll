import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import s from "./Picker.module.css";

export interface PickerOption {
  value: string;
  label: string;
}

/**
 * A one-choice picker drawn in the product's own style: a button and
 * a listbox popover (160 ms scale from 0.96 and fade). Arrow keys
 * move, Enter or Space picks, Escape closes and returns focus.
 */
export function Picker(p: { label: string; value: string;
  options: PickerOption[]; onChange(v: string): void }) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = p.options.find((o) => o.value === p.value)
    ?? p.options[0];
  useEffect(() => {
    if (!open) return undefined;
    setAt(Math.max(0, p.options.findIndex((o) => o.value === p.value)));
    list.current?.focus({ preventScroll: true });
    const off = (e: Event): void => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    addEventListener("pointerdown", off);
    return () => removeEventListener("pointerdown", off);
  }, [open, p.options, p.value]);
  const pick = (v: string): void => {
    p.onChange(v);
    setOpen(false);
    btn.current?.focus({ preventScroll: true });
  };
  return (
    <div className={s.box} ref={box}>
      <button ref={btn} type="button" className={s.button}
        aria-haspopup="listbox" aria-expanded={open}
        aria-label={`${p.label}: ${current?.label ?? ""}`}
        onClick={() => setOpen(!open)}>
        <span className={s.value}>{current?.label}</span>
        <Icon name="chevronDown" size={16} />
      </button>
      {open && (
        <ul ref={list} className={s.list} role="listbox" tabIndex={-1}
          aria-label={p.label}
          aria-activedescendant={`${id}-${at}`}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setAt(Math.min(p.options.length - 1, at + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setAt(Math.max(0, at - 1));
            } else if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              const o = p.options[at];
              if (o !== undefined) pick(o.value);
            } else if (e.key === "Escape" || e.key === "Tab") {
              setOpen(false);
              if (e.key === "Escape") btn.current?.focus();
            }
          }}>
          {p.options.map((o, i) => (
            <li key={o.value} id={`${id}-${i}`} role="option"
              aria-selected={o.value === p.value} className={s.option}
              data-active={i === at}
              onPointerEnter={() => setAt(i)}
              onClick={() => pick(o.value)}>
              <span>{o.label}</span>
              {o.value === p.value && <Icon name="check" size={16} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
