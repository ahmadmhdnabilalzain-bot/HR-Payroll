import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer, type Server } from "node:net";
import { PREVIEW_WATERMARK } from "@payroll/contract";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromeRenderer } from "../src/pdf/chrome-renderer";
import { page, seg as t } from "./helpers/letter-page";

const chromePath = process.env.CHROME_PATH ??
  ["/usr/bin/google-chrome", "/usr/bin/chromium"].find((p) => existsSync(p));

async function pdfText(bytes: Uint8Array): Promise<{ text: string;
  pages: number }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes),
    useSystemFonts: false }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const c = await (await doc.getPage(i)).getTextContent();
    text += c.items.map((x) => ("str" in x ? x.str : "")).join(" ");
  }
  return { text, pages: doc.numPages };
}

describe.skipIf(chromePath === undefined)("real Chrome renderer", () => {
  const font = readFileSync(createRequire(import.meta.url)
    .resolve("dejavu-fonts-ttf/ttf/DejaVuSans.ttf")).toString("base64");
  const logs: Record<string, unknown>[] = [];
  const pdf = chromeRenderer({ executablePath: chromePath!,
    noSandbox: process.getuid?.() === 0 ||
      process.env.CHROME_NO_SANDBOX === "1",
    fontBase64: font, timeoutMs: 20000, log: (l) => logs.push(l) });
  let server: Server;
  let port = 0;
  let hits = 0;
  beforeAll(async () => {
    server = createServer((s) => { hits++; s.destroy(); });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    port = (server.address() as { port: number }).port;
  });
  afterAll(async () => {
    await pdf.close();
    server.close();
  });

  it("renders an English page whose text reads back", async () => {
    const bytes = await pdf.render(page());
    expect(Buffer.from(bytes.subarray(0, 5)).toString()).toBe("%PDF-");
    const { text } = await pdfText(bytes);
    for (const s of ["Salary Certificate", "Sample Employee", "Reference"]) {
      expect(text).toContain(s);
    }
    expect(text).not.toContain("{{");
  }, 60000);

  it("prints the preview watermark", async () => {
    const { text } = await pdfText(await pdf.render(page({
      watermark: PREVIEW_WATERMARK })));
    expect(text).toContain(PREVIEW_WATERMARK);
  }, 60000);

  it("renders an Arabic page with an isolated date on one page",
    async () => {
      const { pages } = await pdfText(await pdf.render(page({ lang: "ar",
        heading: "شركة مثال", paragraphs: [[t("يعمل منذ "),
          t("2019-01-01", true), t(".")]] })));
      expect(pages).toBe(1);
    }, 60000);

  it("an injected image is text, and nothing is fetched", async () => {
    const img = `<img src="http://127.0.0.1:${port}/x">`;
    const { text } = await pdfText(await pdf.render(page({
      paragraphs: [[t(img)]] })));
    expect(text).toContain("<img");
    expect(hits).toBe(0);
  }, 60000);

  it("one failing render does not take the others down (review I-5)",
    async () => {
      const short = chromeRenderer({ executablePath: chromePath!,
        noSandbox: process.getuid?.() === 0 ||
          process.env.CHROME_NO_SANDBOX === "1",
        fontBase64: font, timeoutMs: 1500, log: () => undefined });
      try {
        await short.render(page());
        const huge = `<!doctype html><html><body>${
          "<p>x</p>".repeat(400_000)}</body></html>`;
        const out = await Promise.allSettled([short.renderHtml(huge),
          short.render(page()), short.render(page()),
          short.render(page())]);
        expect(out[0]!.status).toBe("rejected");
        expect(out.slice(1).map((x) => x.status))
          .toEqual(["fulfilled", "fulfilled", "fulfilled"]);
      } finally {
        await short.close();
      }
    }, 90000);

  it("raw HTML with external resources and script makes no request",
    async () => {
      const u = `http://127.0.0.1:${port}`;
      const html = `<!doctype html><html><head>` +
        `<link rel="stylesheet" href="${u}/a.css"></head><body>` +
        `<img src="${u}/b.png"><iframe src="${u}/c"></iframe>` +
        `<script>fetch("${u}/d"); new Image().src = "${u}/e";</script>` +
        `<p>x</p></body></html>`;
      const bytes = await pdf.renderHtml(html);
      expect(Buffer.from(bytes.subarray(0, 5)).toString()).toBe("%PDF-");
      await new Promise((r) => setTimeout(r, 200));
      expect(hits).toBe(0);
    }, 60000);
});
