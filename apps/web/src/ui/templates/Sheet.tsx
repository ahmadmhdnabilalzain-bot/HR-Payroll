import { useEffect, useRef, type ReactNode } from "react";
import { useLocale } from "../../i18n/LocaleProvider";
import { Icon } from "../Icon";
import s from "./templates.module.css";

/**
 * A side sheet (a modal `dialog`): slides in from the reading edge,
 * closes on Esc, the close button or a click on the backdrop. Used by
 * the form-with-approval and settings templates.
 */
export function Sheet(p: { open: boolean; title: string; onClose(): void;
  children: ReactNode }) {
  const { t } = useLocale();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d === null) return;
    if (p.open && !d.open) d.showModal();
    if (!p.open && d.open) d.close();
  }, [p.open]);
  return (
    <dialog ref={ref} className={s.sheet} onClose={p.onClose}
      aria-labelledby="sheet-title" onClick={(e) => {
        if (e.target === ref.current) p.onClose();
      }}>
      {p.open && (
        <div className={s.sheetBody}>
          <div className={s.sheetHead}>
            <h2 id="sheet-title" className={s.sheetTitle}>{p.title}</h2>
            <button type="button" className={s.iconBtn}
              aria-label={t("tpl.close")} onClick={p.onClose}>
              <Icon name="x" size={20} />
            </button>
          </div>
          {p.children}
        </div>
      )}
    </dialog>
  );
}
