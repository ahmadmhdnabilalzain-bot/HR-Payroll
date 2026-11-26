import { useEffect, useRef, useState } from "react";
import { personOf } from "../demo/derive";
import { useDemo, type Role } from "../demo/state";
import { useLocale } from "../i18n/LocaleProvider";
import { Icon } from "../ui/Icon";
import s from "./TopBar.module.css";

const ROLES: Role[] = ["hr", "gm"];

function initials(name: string): string {
  return name.split(" ").filter((w) => w.length > 2 || w === name)
    .slice(0, 2).map((w) => w[0] ?? "").join("");
}

/** Who the demo is being viewed as; the person is from the data. */
export function RoleMenu() {
  const { lang, t } = useLocale();
  const { data, state, dispatch } = useDemo();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
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
  const roleLabel = (r: Role): string =>
    r === "hr" ? t("shell.roleHr") : t("shell.roleGm");
  const me = data.employee(personOf(data, state.role));
  return (
    <div className={s.role} ref={box}>
      <button type="button" className={s.roleBtn} aria-haspopup="menu"
        aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className={s.avatar} aria-hidden="true">
          {initials(me.name.en)}
        </span>
        <span className="visually-hidden">{t("shell.viewingAs")}</span>
        <span className={s.roleText}>{roleLabel(state.role)}</span>
        <Icon name="chevronDown" size={14} />
      </button>
      {open && (
        <div className={s.menu} role="menu"
          aria-label={t("shell.viewingAs")}>
          <p className={s.menuHead}>{t("shell.viewingAs")}</p>
          {ROLES.map((r) => {
            const who = data.employee(personOf(data, r));
            return (
              <button key={r} type="button" role="menuitemradio"
                aria-checked={state.role === r} className={s.menuItem}
                onClick={() => {
                  dispatch({ type: "role", role: r });
                  setOpen(false);
                }}>
                <span className={s.avatar} aria-hidden="true">
                  {initials(who.name.en)}
                </span>
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
    </div>
  );
}
