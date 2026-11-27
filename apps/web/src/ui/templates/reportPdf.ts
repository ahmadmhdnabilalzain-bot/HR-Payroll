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

/**
 * Share the report's link: the system share sheet where there is one
 * (Safari on iPhone and Mac), else the link is copied. Returns what
 * happened, for the toast.
 */
export async function shareReport(title: string)
  : Promise<"shared" | "copied" | "cancelled" | "none"> {
  const url = location.href;
  const nav = navigator as Navigator & {
    share?: (d: { title: string; url: string }) => Promise<void>;
  };
  if (typeof nav.share === "function") {
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
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "none";
  }
}
