import { useEffect, useRef } from "react";
import type { SectionId } from "../nav/types";
import { SectionList } from "./SectionList";
import s from "./SectionPanel.module.css";

/**
 * The sheet under the bar for one section (navigation map, section 2):
 * opens on a word, closes on Esc, a click outside or a pick; the first
 * area takes focus.
 */
export function SectionPanel(p: { section: SectionId; label: string;
  onClose(): void; anchor: HTMLElement | null }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.querySelector<HTMLElement>("a[data-area]")
      ?.focus({ preventScroll: true });
    const off = (e: Event): void => {
      const t = e.target as Node;
      if (!box.current?.contains(t) && !p.anchor?.contains(t)) p.onClose();
    };
    const esc = (e: KeyboardEvent): void => {
      if (e.key !== "Escape") return;
      p.onClose();
      p.anchor?.focus();
    };
    addEventListener("pointerdown", off);
    addEventListener("keydown", esc);
    return () => {
      removeEventListener("pointerdown", off);
      removeEventListener("keydown", esc);
    };
  }, [p]);
  return (
    <div ref={box} className={s.panel} role="region" aria-label={p.label}
      id={`panel-${p.section}`}>
      <nav aria-label={p.label}>
        <SectionList section={p.section} variant="panel"
          onPick={p.onClose} />
      </nav>
    </div>
  );
}
