import { isWebKit } from "../ui/viewTransition";

/**
 * Hands the viewer a PDF made in the browser, in a way that works on
 * an iPhone. Safari on iOS may ignore `a[download]` for a blob (in a
 * home-screen app, in some versions), and the share sheet or a new tab
 * is refused once the tap that asked for the file has lapsed (an
 * awaited PDF build can take that long). So, in order:
 *
 * 1. iPhone and iPad: the share sheet with the file (Save to Files,
 *    Mail, AirDrop), where `navigator.canShare({ files })` says yes.
 * 2. iPhone and iPad: the PDF in a new tab (Safari's own viewer, with
 *    its share button).
 * 3. Everywhere else: an anchor with `download` (laptops, Android).
 * 4. If all of that is refused: a visible "Open PDF" link the person
 *    taps (a fresh tap, so Safari allows it).
 *
 * The blob address is kept for a while (a tab or link may open late);
 * nothing is sent anywhere.
 */

export type PdfOutcome = "shared" | "cancelled" | "opened" |
  "downloaded" | "link";

/** How long a blob address stays valid after it is handed over. */
export const KEEP_URL_MS = 5 * 60_000;

/** An iPhone or iPad (iPadOS calls itself a Mac, but has touch). */
export function touchWebKit(): boolean {
  return isWebKit() && typeof navigator !== "undefined" &&
    (navigator.maxTouchPoints ?? 0) > 0;
}

const pdfName = (name: string): string =>
  /\.pdf$/i.test(name) ? name : `${name}.pdf`;

function later(url: string): void {
  setTimeout(() => URL.revokeObjectURL(url), KEEP_URL_MS);
}

/** A link the person taps to open the file: the last resort. */
export function showPdfLink(url: string, name: string,
  label = "Open PDF"): HTMLAnchorElement {
  document.querySelectorAll("[data-pdf-link]").forEach((x) => x.remove());
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  a.download = name;
  a.textContent = `${label}: ${name}`;
  a.dataset["pdfLink"] = "";
  a.setAttribute("role", "status");
  Object.assign(a.style, {
    position: "fixed", zIndex: "70",
    insetInline: "16px",
    insetBlockEnd: "calc(16px + env(safe-area-inset-bottom, 0px))",
    padding: "14px 16px", borderRadius: "12px", textAlign: "center",
    background: "var(--color-ink, #111)", color: "var(--color-paper, #fff)",
    fontFamily: "inherit", fontSize: "16px", fontWeight: "500",
    lineHeight: "1.3", textDecoration: "none",
    boxShadow: "0 8px 24px rgba(0,0,0,.2)",
  });
  a.addEventListener("click", () => setTimeout(() => a.remove(), 400));
  document.body.append(a);
  setTimeout(() => a.remove(), KEEP_URL_MS);
  return a;
}

/**
 * Gives the viewer `blob` as `name` (".pdf" added if missing) and says
 * which way it went. Call it from the tap's handler, as early as you
 * can: the share sheet and a new tab need that tap to be recent.
 */
export async function savePdf(blob: Blob, name: string,
  o: { label?: string } = {}): Promise<PdfOutcome> {
  const file = pdfName(name);
  const typed = blob.type === "application/pdf" ? blob
    : new Blob([blob], { type: "application/pdf" });
  const url = URL.createObjectURL(typed);
  later(url);
  if (touchWebKit()) {
    const nav = navigator as Navigator & {
      canShare?: (d: ShareData) => boolean };
    try {
      const f = new File([typed], file, { type: "application/pdf" });
      const data = { files: [f], title: file };
      if (typeof nav.share === "function" &&
        typeof nav.canShare === "function" && nav.canShare(data)) {
        await nav.share(data);
        return "shared";
      }
    } catch (e) {
      // The person closed the sheet: that is their answer.
      if (e instanceof Error && e.name === "AbortError") return "cancelled";
      // NotAllowedError (the tap lapsed) or no File: try a tab.
    }
    // Not "noopener" in the features: then open() returns null even
    // when it worked. Null here means Safari blocked the tab.
    const tab = window.open(url, "_blank");
    if (tab !== null) {
      tab.opener = null;
      return "opened";
    }
    showPdfLink(url, file, o.label);
    return "link";
  }
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = file;
    a.rel = "noopener";
    document.body.append(a);
    a.click();
    a.remove();
    return "downloaded";
  } catch {
    showPdfLink(url, file, o.label);
    return "link";
  }
}
