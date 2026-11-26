// The offline demo: one self-contained HTML file that opens by double
// click (file://) with no network and no server. Builds the app as a
// single chunk, then inlines the script, the styles, the fonts (woff2,
// Latin and Arabic subsets only) and the favicon.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync,
  writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

const WEB = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(WEB, "dist-offline");
const TMP = join(OUT, ".tmp");
const FILE = "mubinflow-demo.html";
const KEEP_SUBSET = /-(latin|latin-ext|arabic)-\d{3}-/;

async function bundle() {
  rmSync(OUT, { recursive: true, force: true });
  await build({ root: WEB, base: "./", logLevel: "warn",
    build: { outDir: TMP, emptyOutDir: true, assetsInlineLimit: 0,
      cssCodeSplit: false, modulePreload: false,
      rollupOptions: { output: { codeSplitting: false } } } });
}

function assetsByName() {
  const dir = join(TMP, "assets");
  return new Map(readdirSync(dir).map((f) => [f, join(dir, f)]));
}

const dataUrl = (path, type) =>
  `data:${type};base64,${readFileSync(path).toString("base64")}`;

/** Drop unused subsets and the woff fallback; inline the woff2. */
function inlineFonts(css, assets) {
  return css.replace(/@font-face\{[^}]*\}/g, (face) => {
    const woff2 = /url\(([^)]+\.woff2)\)/.exec(face)?.[1];
    if (woff2 === undefined || !KEEP_SUBSET.test(woff2)) return "";
    const path = assets.get(basename(woff2));
    if (path === undefined) throw new Error(`OFFLINE_NO_FONT ${woff2}`);
    return face.replace(/src:[^;}]*/,
      `src:url(${dataUrl(path, "font/woff2")}) format("woff2")`);
  });
}

function inlineHtml() {
  const assets = assetsByName();
  let html = readFileSync(join(TMP, "index.html"), "utf8");
  html = html.replace(/<script type="module"[^>]*src="([^"]+)"><\/script>/,
    (_all, src) => {
      const js = readFileSync(join(TMP, src), "utf8")
        .replace(/<\/script/gi, "<\\/script");
      return `<script type="module">${js}</script>`;
    });
  html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)">/,
    (_all, href) => `<style>${inlineFonts(readFileSync(join(TMP, href),
      "utf8"), assets)}</style>`);
  html = html.replace(/<link rel="icon" href="[^"]*favicon\.svg"[^>]*>/,
    `<link rel="icon" href="${dataUrl(join(TMP, "favicon.svg"),
      "image/svg+xml")}">`);
  const png = /<link rel="(icon|apple-touch-icon)" href="[^"]*\.png"[^>]*>/g;
  html = html.replace(png, "");
  if (/src="\.\/|href="\.\//.test(html)) {
    throw new Error("OFFLINE_EXTERNAL_REFERENCE left in the page");
  }
  return html;
}

await bundle();
const html = inlineHtml();
if (!existsSync(OUT)) mkdirSync(OUT);
writeFileSync(join(OUT, FILE), html);
rmSync(TMP, { recursive: true, force: true });
console.log(`offline demo: dist-offline/${FILE} ` +
  `(${(html.length / 1048576).toFixed(1)} MB)`);
