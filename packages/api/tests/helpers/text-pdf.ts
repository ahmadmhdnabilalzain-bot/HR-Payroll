import { segmentsText } from "../../src/letters/merge";
import type { PdfRenderer } from "../../src/pdf/renderer";

/**
 * A fake renderer for API tests: bytes that sniff as PDF and carry
 * the page as readable JSON, so letter downloads can be checked as
 * text.
 */
export function textPdfRenderer(): PdfRenderer {
  return {
    render: async (p) => new TextEncoder().encode(`%PDF-1.4\n% ` +
      JSON.stringify({ lang: p.lang, heading: p.heading,
        dateLine: segmentsText(p.dateLine), refLine: segmentsText(p.refLine),
        title: segmentsText(p.title),
        paragraphs: p.paragraphs.map(segmentsText),
        issuerLines: p.issuerLines, watermark: p.watermark }) +
      "\n%%EOF\n"),
    close: async () => undefined,
  };
}
