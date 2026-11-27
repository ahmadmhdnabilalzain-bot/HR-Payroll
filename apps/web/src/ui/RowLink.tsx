import type {
  AnchorHTMLAttributes, HTMLAttributes, KeyboardEvent, MouseEvent,
  ReactNode,
} from "react";
import css from "./RowLink.module.css";

/**
 * One whole-row link or button for every list in the app: notices, the
 * bell, To do, Waiting, expiries, people. A row that looks pressable
 * must go somewhere; this is the one way to make it do so.
 *
 * - `href` (a `#/...` hash or a full URL): the row is a link.
 * - `onActivate` with no `href`: the row is a button (opens a sheet,
 *   snoozes, marks read).
 *
 * Clicks and keys that start on a control inside the row (a button, a
 * link, an input) are left to that control, so a row may hold its own
 * "Later" or "Sign off" buttons and still open its root when the rest
 * of it is pressed.
 */
export interface RowLinkOptions {
  href?: string | undefined;
  onActivate?: (() => void) | undefined;
  /** Accessible name when the row's text is not enough. */
  label?: string | undefined;
  /** Mark the row as the current page (`aria-current="page"`). */
  current?: boolean | undefined;
  disabled?: boolean | undefined;
}

const NESTED = "a[href],button,input,select,textarea,label,summary,"
  + "[role=button],[role=link],[role=menuitem],[role=checkbox],"
  + "[role=switch],[role=tab]";

/** True when the event began on a control inside the row, not the row. */
function fromNested(e: { target: EventTarget; currentTarget: Element },
): boolean {
  const t = e.target;
  if (!(t instanceof Element) || t === e.currentTarget) return false;
  const hit = t.closest(NESTED);
  return hit !== null && hit !== e.currentTarget
    && e.currentTarget.contains(hit);
}

/** Follow a row's href: a hash in place, anything else as a page load. */
export function followHref(href: string, newTab = false): void {
  if (newTab) { window.open(href, "_blank", "noopener"); return; }
  if (href.startsWith("#")) location.hash = href.slice(1);
  else location.assign(href);
}

export interface RowLinkProps {
  role: "link" | "button";
  tabIndex: number;
  className: string;
  onClick: (e: MouseEvent<HTMLElement>) => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  "aria-label"?: string;
  "aria-current"?: "page";
  "aria-disabled"?: true;
  "data-href"?: string;
  "data-rowlink": "";
}

/**
 * Props that make any element a whole-row link or button. Spread them
 * on an `li`, `div` or `article` that holds other controls; use
 * `<RowLink>` when the row holds none.
 */
export function useRowLink(o: RowLinkOptions): RowLinkProps {
  const go = (newTab: boolean): void => {
    if (o.disabled === true) return;
    if (o.href !== undefined) followHref(o.href, newTab);
    o.onActivate?.();
  };
  return {
    role: o.href !== undefined ? "link" : "button",
    tabIndex: o.disabled === true ? -1 : 0,
    className: css.row ?? "",
    onClick: (e) => {
      if (fromNested(e)) return;
      if (window.getSelection()?.toString() !== "") return;
      go(o.href !== undefined && (e.metaKey || e.ctrlKey));
    },
    onKeyDown: (e) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go(false);
      }
    },
    ...(o.label !== undefined ? { "aria-label": o.label } : {}),
    ...(o.current === true ? { "aria-current": "page" as const } : {}),
    ...(o.disabled === true ? { "aria-disabled": true as const } : {}),
    ...(o.href !== undefined ? { "data-href": o.href } : {}),
    "data-rowlink": "",
  };
}

type Base = RowLinkOptions & { children: ReactNode; className?: string };

/**
 * A whole-row link (a real `<a>` when there is an `href` and nothing
 * pressable inside) or button. Pass `nested` when the row holds its
 * own buttons: it then renders a `div` with link semantics instead.
 */
export function RowLink(p: Base & { nested?: boolean }
  & Omit<HTMLAttributes<HTMLElement>, "onClick" | "role">): ReactNode {
  const { href, onActivate, label, current, disabled, nested, children,
    className, ...rest } = p;
  const row = useRowLink({ href, onActivate, label, current, disabled });
  const cls = [row.className, className].filter(Boolean).join(" ");
  if (href !== undefined && nested !== true && disabled !== true) {
    const a: AnchorHTMLAttributes<HTMLAnchorElement> = {
      ...rest, href, className: cls,
      onClick: () => onActivate?.(),
    };
    return (
      <a {...a} data-rowlink="" aria-label={label}
        aria-current={current === true ? "page" : undefined}>
        {children}
      </a>
    );
  }
  return <div {...rest} {...row} className={cls}>{children}</div>;
}

/** The trailing chevron a row link shows on laptop. */
export function RowChevron(): ReactNode {
  return (
    <svg className={css.chevron} aria-hidden="true" width="16"
      height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const rowLinkClass = css.row;
