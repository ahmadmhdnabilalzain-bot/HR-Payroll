import { describe, expect, it } from "vitest";
import { CSP_META, escapeHtml, letterHtml } from "../src/pdf/letter-html";
import { page, seg as t } from "./helpers/letter-page";

describe("letterHtml (Review Focus 4)", () => {
  it("html_escapes_values", () => {
    const html = letterHtml(page({ paragraphs: [[
      t("<img src=\"http://x\">")]] }), "AAAA");
    expect(html).toContain("&lt;img src=&quot;http://x&quot;&gt;");
    expect(html).not.toContain("<img");
    expect(escapeHtml("&<>\"'")).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
  it("carries the CSP and no script", () => {
    const html = letterHtml(page(), "AAAA");
    expect(html).toContain(CSP_META);
    expect(html).not.toMatch(/<script/i);
    expect(html.startsWith("<!doctype html>")).toBe(true);
  });
  it("sets direction and language", () => {
    expect(letterHtml(page({ lang: "ar" }), "A"))
      .toContain("<html lang=\"ar\" dir=\"rtl\">");
    expect(letterHtml(page(), "A"))
      .toContain("<html lang=\"en\" dir=\"ltr\">");
  });
  it("isolates dates and money left to right", () => {
    const html = letterHtml(page({ paragraphs: [[t("since "),
      t("2019-01-01", true)]] }), "A");
    expect(html).toContain("<bdi dir=\"ltr\">2019-01-01</bdi>");
  });
  it("an isolated amount with an Arabic currency word runs right to left",
    () => {
      // Else "4,000.00 درهم" shows the word before the number.
      const html = letterHtml(page({ lang: "ar", paragraphs: [[
        t("4,000.00 درهم", true)]] }), "A");
      expect(html).toContain("<bdi dir=\"rtl\">4,000.00 درهم</bdi>");
    });
  it("shows the watermark only when set", () => {
    expect(letterHtml(page(), "A")).not.toContain("PREVIEW");
    expect(letterHtml(page({ watermark: "PREVIEW - NOT ISSUED" }), "A"))
      .toContain("PREVIEW - NOT ISSUED");
  });
  it("the only URL is the embedded font", () => {
    const html = letterHtml(page(), "QUJD");
    const urls = [...html.matchAll(/url\(/g)];
    expect(urls.length).toBe(1);
    expect(html).toContain("url(data:font/ttf;base64,QUJD)");
    expect(html).not.toMatch(/https?:/);
  });
});
