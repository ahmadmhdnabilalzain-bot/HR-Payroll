import type { MouseEvent } from "react";
import { followHref } from "./RowLink";

const NESTED = "a[href],button,input,select,textarea,label,summary,"
  + "[role=button],[role=link],[role=menuitem],[role=checkbox],"
  + "[role=switch],[role=tab],[role=dialog]";

/**
 * A mouse press anywhere on a box (a table row, a panel) that opens
 * `href`, for boxes whose keyboard path is a link inside them already
 * (the row's first cell, the panel's title). Presses on a control in
 * the box keep their own handler, and so do presses inside a sheet the
 * box opened through a portal (a figure's "Why this number"): React
 * bubbles those up the component tree, not the page.
 */
export function rowClick(href: string | undefined):
  ((e: MouseEvent<HTMLElement>) => void) | undefined {
  if (href === undefined) return undefined;
  return (e) => {
    const box = e.currentTarget;
    const t = e.target;
    if (!(t instanceof Element) || !box.contains(t)) return;
    const hit = t.closest(NESTED);
    if (hit !== null && hit !== box && box.contains(hit)) return;
    if (e.defaultPrevented) return;
    if (window.getSelection()?.toString() !== "") return;
    followHref(href, e.metaKey || e.ctrlKey);
  };
}
