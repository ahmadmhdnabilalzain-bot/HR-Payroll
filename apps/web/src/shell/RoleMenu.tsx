import { useEffect, useRef, useState } from "react";
import { useSwitchRole } from "../demo/actions";
import { personOf } from "../demo/derive";
import { useDemo, type Role } from "../demo/state";
import type { MessageKey } from "../i18n/t";
import { useLocale } from "../i18n/LocaleProvider";
import { NotificationsSheet, useUnread } from "../home/inbox/Notifications";
import { useTheme } from "../theme/ThemeProvider";
import { Avatar } from "../ui/Avatar";
import { Icon } from "../ui/Icon";
import { usePresence } from "../ui/presence";
import s from "./TopBar.module.css";

export const ROLES: Role[] = ["hr", "gm", "it", "manager", "employee"];

export const ROLE_KEY: Record<Role, MessageKey> = { hr: "shell.roleHr",
  gm: "shell.roleGm", it: "shell.roleIt", manager: "shell.roleManager",
  employee: "shell.roleEmployee" };

/**
 * Who the demo is being viewed as; the person is from the data. On a
 * phone this is the one overflow menu: notifications, hide amounts and
 * theme sit above the roles (the bar shows only the logo, search and
 * this avatar, which carries the unread dot).
 */
export function RoleMenu() {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const switchRole = useSwitchRole();
  const { resolved, setPref } = useTheme();
  const bell = useUnread();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(false);
  const dark = resolved === "dark";
  const box = useRef<HTMLDivElement>(null);
  // The menu fades out over --dur-fast before it leaves (inert).
  const menu = usePresence(open, 140);
  // A chosen role waits for the menu's exit, so the switch never
  // fades the page under a menu still on screen (audit 2, item 7).
  const chosen = useRef<{ role: Role; at: string } | null>(null);
  useEffect(() => {
    const c = chosen.current;
    if (menu.mounted || c === null) return;
    chosen.current = null;
    switchRole(c.role, c.at);
  }, [menu.mounted]);
  useEffect(() => {
    if (!open) return undefined;
    const off = (e: Event): void => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    addEventListener("pointerdown", off);
    addEventListener("keydown", esc);
    return () => {
      removeEventListener("pointerdown", off);
      removeEventListener("keydown", esc);
    };
  }, [open]);
  const roleLabel = (r: Role): string => t(ROLE_KEY[r]);
  const me = data.employee(personOf(data, state.role));
  return (
    <div className={s.role} ref={box}>
      <button type="button" className={s.roleBtn} aria-haspopup="menu"
        aria-expanded={open} onClick={() => setOpen(!open)}>
        <Avatar id={me.id} name={me.name.en} size="xs" />
        {bell.unread > 0 && <span className={s.dot} aria-hidden="true" />}
        <span className="visually-hidden">{t("shell.viewingAs")}</span>
        <span className={s.roleText}>{roleLabel(state.role)}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      {menu.mounted && (
        <div className={s.menu} role="menu" data-leaving={menu.leaving}
          inert={menu.leaving} aria-hidden={menu.leaving || undefined}
          aria-label={t("shell.viewingAs")}>
          <div className={s.phoneOnly} role="group"
            aria-label={t("shell.phoneTools")}>
            <button type="button" role="menuitem" className={s.menuItem}
              onClick={() => {
                setOpen(false);
                setNotes(true);
              }}>
              <Icon name="bell" size={18} />
              <span className={s.menuText}>{bell.label}</span>
              {bell.unread > 0 && (
                <span className={s.menuCount} aria-hidden="true">
                  {bell.unread}
                </span>
              )}
            </button>
            <button type="button" role="menuitemcheckbox"
              aria-checked={state.hideAmounts} className={s.menuItem}
              onClick={() => dispatch({ type: "toggle-amounts" })}>
              <Icon name={state.hideAmounts ? "eyeOff" : "eye"} size={18} />
              <span className={s.menuText}>{t("shell.hideAmounts")}</span>
              {state.hideAmounts && <Icon name="check" size={16} />}
            </button>
            <button type="button" role="menuitem" className={s.menuItem}
              onClick={() => {
                setPref(dark ? "light" : "dark");
                setOpen(false);
              }}>
              <Icon name={dark ? "sun" : "moon"} size={18} />
              <span className={s.menuText}>
                {dark ? t("shell.toLight") : t("shell.toDark")}
              </span>
            </button>
          </div>
          <p className={s.menuHead}>{t("shell.viewingAs")}</p>
          {ROLES.map((r) => {
            const who = data.employee(personOf(data, r));
            return (
              <button key={r} type="button" role="menuitemradio"
                aria-checked={state.role === r} className={s.menuItem}
                onClick={() => {
                  chosen.current = { role: r, at: location.hash };
                  setOpen(false);
                }}>
                <Avatar id={who.id} name={who.name.en} size="sm" />
                <span className={s.menuText}>
                  <span>{roleLabel(r)}</span>
                  <span className={s.menuSub}>{who.name[lang]}</span>
                </span>
                {state.role === r && <Icon name="check" size={16} />}
              </button>
            );
          })}
        </div>
      )}
      <NotificationsSheet open={notes} onClose={() => setNotes(false)} />
    </div>
  );
}
