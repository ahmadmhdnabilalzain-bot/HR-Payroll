import { useOptionalDemo } from "../demo/state";

/** What an amount reads as while amounts are hidden (as <Money/>). */
export const MONEY_MASK = "AED ••••••";

/** "AED 25,300.00", "+AED 5.00", "−AED 1,180.64", "AED 1,000" (any
 * space after AED), and in running text or a table cell a bare
 * "4,950.00", "1,000" or "52000.00" (not "108.71 days"). */
const AMOUNT = new RegExp("[+\\u2212-]?AED[\\s\\u00a0\\u202f]*" +
  "[+\\u2212-]?\\d[\\d,]*(?:\\.\\d+)?|(?<![\\d.,])(?:\\d{1,3}" +
  "(?:,\\d{3})+(?:\\.\\d{2})?|\\d{3,}\\.\\d{2})" +
  "(?![\\d]|\\s*(?:days?|hours?|h\\b|%))", "g");

/** Every money amount in a sentence replaced by the mask. */
export function maskMoney(text: string): string {
  return text.replace(AMOUNT, MONEY_MASK);
}

/** A node shown as text: strings are masked, elements pass through
 * (<Money/> masks itself). */
export function maskNode<T>(mask: (t: string) => string, v: T): T | string {
  return typeof v === "string" ? mask(v) : v;
}

/**
 * Text that may hold an amount (a sentence from the data, a table
 * cell), masked like <Money/> while amounts are hidden. Use it
 * wherever an amount reaches the screen as plain text.
 */
export function useMaskText(): (text: string) => string {
  const state = useOptionalDemo()?.state;
  const hide = state !== undefined && amountsHidden(state);
  return (text) => hide ? maskMoney(text) : text;
}

/** Amounts are hidden, or the viewer is the IT manager, who sees no
 * one's pay (roles page: "sees no salaries"). */
export function amountsHidden(s: { hideAmounts: boolean; role: string })
  : boolean {
  return s.hideAmounts || s.role === "it";
}

/** A CSV with whole columns blanked out (by header), for a viewer who
 * may not read them; the values become the mask. */
export function maskCsvColumns(csv: string, headers: readonly string[])
  : string {
  const lines = csv.split("\n");
  const head = (lines[0] ?? "").split(",");
  const cols = head.map((h, i) => headers.includes(h.replace(/"/g, "")
    .trim()) ? i : -1).filter((i) => i >= 0);
  return lines.map((l, n) => n === 0 || l === "" ? l : l.split(",")
    .map((v, i) => cols.includes(i) ? "masked" : v).join(",")).join("\n");
}
