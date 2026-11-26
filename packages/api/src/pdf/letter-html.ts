import type { Segment } from "../letters/merge";
import type { LetterPage } from "./renderer";

/** Nothing loads but inline style and the embedded font. */
export const CSP_META = "<meta http-equiv=\"Content-Security-Policy\" " +
  "content=\"default-src 'none'; style-src 'unsafe-inline'; " +
  "font-src data:\">";

const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;",
  ">": "&gt;", "\"": "&quot;", "'": "&#39;" };

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ENTITIES[c]!);
}

const RTL_LETTER = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufeff]/;

/**
 * Escaped text. Isolated runs (dates, money) are one unit: left to
 * right ("2019-01-01" never turns into "01-01-2019" inside Arabic),
 * or right to left when the run holds an Arabic word, so the Arabic
 * amount "4,000.00 درهم" keeps the number before the currency word.
 */
function runs(ss: readonly Segment[]): string {
  return ss.map((s) => s.isolate
    ? `<bdi dir="${RTL_LETTER.test(s.text) ? "rtl" : "ltr"}">` +
      `${escapeHtml(s.text)}</bdi>`
    : escapeHtml(s.text)).join("");
}

function style(fontBase64: string): string {
  return [
    "@font-face{font-family:'DejaVu Sans';",
    `src:url(data:font/ttf;base64,${fontBase64}) format('truetype');}`,
    "@page{size:A4;margin:22mm 20mm;}",
    "body{font-family:'DejaVu Sans';font-size:11pt;line-height:1.6;",
    "color:#111;font-variant-ligatures:no-common-ligatures;}",
    "h1{font-size:15pt;margin:18pt 0 12pt;}",
    ".head{font-size:13pt;font-weight:bold;margin-bottom:10pt;}",
    ".meta{margin:0;}.issuer{margin-top:28pt;}",
    ".wm{position:fixed;top:45%;left:0;right:0;text-align:center;",
    "font-size:40pt;color:#d9d9d9;transform:rotate(-30deg);",
    "z-index:-1;}",
  ].join("");
}

/**
 * The letter as a self-contained HTML page: no script, no image, no
 * external URL; every value escaped; the CSP stops anything that
 * slipped through from loading.
 */
export function letterHtml(page: LetterPage, fontBase64: string): string {
  const dir = page.lang === "ar" ? "rtl" : "ltr";
  const paras = page.paragraphs.map((p) => `<p>${runs(p)}</p>`).join("");
  const issuer = page.issuerLines.map((l) =>
    `<div>${escapeHtml(l)}</div>`).join("");
  const wm = page.watermark === null ? ""
    : `<div class="wm">${escapeHtml(page.watermark)}</div>`;
  return `<!doctype html><html lang="${page.lang}" dir="${dir}"><head>` +
    `<meta charset="utf-8">${CSP_META}<style>${style(fontBase64)}</style>` +
    `</head><body>${wm}<div class="head">${escapeHtml(page.heading)}` +
    `</div><p class="meta">${runs(page.dateLine)}</p>` +
    `<p class="meta">${runs(page.refLine)}</p><h1>${runs(page.title)}` +
    `</h1>${paras}<div class="issuer">${issuer}</div></body></html>`;
}
