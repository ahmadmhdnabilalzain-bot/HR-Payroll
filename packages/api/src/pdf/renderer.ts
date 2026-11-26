import { ApiError } from "../http/errors";
import type { Segment } from "../letters/merge";

/** One letter, ready to print. Every string is printed as text. */
export interface LetterPage {
  lang: "en" | "ar";
  heading: string;
  /** Label and date; the date segment is isolated left to right. */
  dateLine: Segment[];
  refLine: Segment[];
  title: Segment[];
  paragraphs: Segment[][];
  issuerLines: string[];
  watermark: string | null;
}

/** Prints letter pages to PDF bytes. */
export interface PdfRenderer {
  render(page: LetterPage): Promise<Uint8Array>;
  close(): Promise<void>;
}

/** No renderer configured (no CHROME_PATH): letters answer 503. */
export function unavailableRenderer(): PdfRenderer {
  return {
    render: async () => {
      throw new ApiError("PDF_RENDERER_UNAVAILABLE");
    },
    close: async () => undefined,
  };
}
