import { useState } from "react";
import { useDemo } from "../../demo/state";
import { useLocale } from "../../i18n/LocaleProvider";
import b from "../../ui/button.module.css";
import { Icon } from "../../ui/Icon";
import { Sheet } from "../../ui/templates";
import { useToast } from "../../ui/Toast";
import { inboxNotes } from "./model";
import s from "./inbox.module.css";

/**
 * The bell at the right of the bar (navigation map, section 2): the
 * role's notifications in a side sheet, newest first. Opening one marks
 * it read; "Mark all as read" has an undo.
 */
export function NotificationsButton(p: { className: string }) {
  const [open, setOpen] = useState(false);
  const { label, unread } = useUnread();
  return (
    <>
      <button type="button" className={`${p.className} ${s.bell}`}
        aria-label={label} title={label} aria-haspopup="dialog"
        onClick={() => setOpen(true)}>
        <Icon name="bell" size={18} />
        {unread > 0 && (
          <span className={s.badge} aria-hidden="true" />
        )}
      </button>
      <NotificationsSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** The bell's name and the unread count (the phone menu shows both). */
export function useUnread(): { label: string; unread: number } {
  const { t } = useLocale();
  const { data, state } = useDemo();
  const n = inboxNotes(data, state).filter((x) => x.unread).length;
  return { unread: n, label: n === 0 ? t("inbox.notes")
    : t("inbox.notesUnread", { count: n }) };
}

/** The notifications sheet, opened by the bell or the phone menu. */
export function NotificationsSheet(p: { open: boolean; onClose(): void }) {
  const { t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const toast = useToast();
  const setOpen = (v: boolean): void => {
    if (!v) p.onClose();
  };
  const notes = inboxNotes(data, state);
  const unread = notes.filter((n) => n.unread).map((n) => n.id);
  return (
    <>
      <Sheet open={p.open} title={t("inbox.notes")}
        onClose={() => setOpen(false)}>
        {notes.length === 0 ? <p className={s.empty}>{t("inbox.notesEmpty")}</p>
          : (
            <ul className={s.notes}>
              {notes.map((n) => (
                <li key={n.id} className={s.note} data-unread={n.unread}>
                  {n.href === null ? (
                    <span className={s.noteTitle}>{n.title}</span>
                  ) : (
                    <a className={s.noteTitle} href={n.href} onClick={() => {
                      dispatch({ type: "notes-read", ids: [n.id] });
                      setOpen(false);
                    }}>{n.title}</a>
                  )}
                  <span className={s.body}>{n.body}</span>
                  <span className={s.meta}>
                    {n.agoText}
                    {n.unread && (
                      <span className="visually-hidden">
                        {`, ${t("inbox.unread")}`}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        {unread.length > 0 && (
          <div className={s.sheetFoot}>
            <button type="button" className={`${b.btn} ${b.secondary}`}
              onClick={() => {
                dispatch({ type: "notes-read", ids: unread });
                toast.show(t("inbox.readToast"), () =>
                  dispatch({ type: "notes-unread", ids: unread }));
              }}>
              {t("inbox.markAllRead")}
            </button>
          </div>
        )}
      </Sheet>
    </>
  );
}
