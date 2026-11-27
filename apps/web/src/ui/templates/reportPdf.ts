/**
 * The seam for "Download PDF" on every report (ReportPage). The PDF
 * generator (apps/web/src/pdf/, built separately) registers itself
 * here once it loads:
 *
 *   import { registerReportPdf } from "../ui/templates/reportPdf";
 *   registerReportPdf(async (r) => { ...build and save r... });
 *
 * Until one is registered, the button opens the browser's print sheet
 * on the report alone (the page prints black on white), where "Save
 * as PDF" gives the same file. Nothing else in the app changes when
 * the generator lands. Coordinated in apps/web/DEMO.md.
 */

export interface ReportForPdf {
  title: string;
  period: string;
  /** Suggested file name, without the extension. */
  fileName: string;
  /** The report's own element (head, figure, chart, table, note). */
  element: HTMLElement | null;
}

export type ReportPdfMaker = (r: ReportForPdf) => Promise<void> | void;

let maker: ReportPdfMaker | null = null;

/** The PDF generator calls this once; a later call replaces it. */
export function registerReportPdf(fn: ReportPdfMaker | null): void {
  maker = fn;
}

/** Whether a real generator is registered (else: the print sheet). */
export function hasReportPdf(): boolean {
  return maker !== null;
}

/** Download the report as a PDF, or fall back to the print sheet. */
export async function downloadReportPdf(r: ReportForPdf): Promise<void> {
  if (maker !== null) {
    try {
      await maker(r);
      return;
    } catch {
      // A failed build never leaves the person with nothing.
    }
  }
  if (typeof print === "function") print();
}

/** A phone or tablet held by hand: the only place the share sheet
 * beats copying the link. */
function touch(): boolean {
  return typeof matchMedia === "function" &&
    matchMedia("(pointer: coarse)").matches;
}

/** The old way, for a browser without the async clipboard (or one
 * that refuses it): a hidden text box, selected and copied. */
function copyByHand(text: string): boolean {
  if (typeof document.execCommand !== "function") return false;
  const box = document.createElement("textarea");
  box.value = text;
  box.setAttribute("readonly", "");
  box.style.position = "fixed";
  box.style.opacity = "0";
  box.style.insetBlockStart = "0";
  document.body.append(box);
  const was = document.activeElement;
  box.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  box.remove();
  if (was instanceof HTMLElement) was.focus();
  return ok;
}

/** Copy a link: the clipboard, else the hidden text box. */
export async function copyLink(url: string): Promise<boolean> {
  try {
    if (typeof navigator.clipboard?.writeText === "function") {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch {
    // Refused (no permission, not focused): try the old way.
  }
  return copyByHand(url);
}

/** Share opens the system sheet here (else the button copies). */
export function sheetShare(): boolean {
  return typeof (navigator as { share?: unknown }).share === "function" &&
    touch();
}

/**
 * Share the report's link: on a touch screen with a system share
 * sheet, the sheet; everywhere else the link is copied. Returns what
 * happened, for the toast.
 */
export async function shareReport(title: string)
  : Promise<"shared" | "copied" | "cancelled" | "none"> {
  const url = location.href;
  const nav = navigator as Navigator & {
    share?: (d: { title: string; url: string }) => Promise<void>;
  };
  if (nav.share !== undefined && sheetShare()) {
    try {
      await nav.share({ title, url });
      return "shared";
    } catch (e) {
      // The person closed the sheet: nothing to say.
      if (e instanceof DOMException && e.name === "AbortError") {
        return "cancelled";
      }
    }
  }
  return await copyLink(url) ? "copied" : "none";
}
