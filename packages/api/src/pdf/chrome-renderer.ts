import puppeteer, { type Browser, type HTTPRequest } from "puppeteer-core";
import type { Logger } from "../deps";
import { ApiError } from "../http/errors";
import { letterHtml } from "./letter-html";
import type { PdfRenderer } from "./renderer";

export interface ChromeOptions {
  executablePath: string;
  /** Chrome's own sandbox off (needed when running as root). */
  noSandbox: boolean;
  fontBase64: string;
  timeoutMs: number;
  log: Logger;
}

export interface ChromeRenderer extends PdfRenderer {
  /** Prints raw HTML under the same lock-down (tests use this seam). */
  renderHtml(html: string): Promise<Uint8Array>;
}

/** Only `data:` URLs (the embedded font) may load; all else aborts. */
function onlyData(r: HTTPRequest): void {
  if (r.url().startsWith("data:")) void r.continue();
  else void r.abort("blockedbyclient");
}

async function print(browser: Browser, html: string, timeout: number)
  : Promise<Uint8Array> {
  // A fresh isolated context per letter: no cookies, cache or storage
  // shared between letters or companies.
  const ctx = await browser.createBrowserContext();
  try {
    const page = await ctx.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", onlyData);
    await page.setContent(html, { waitUntil: "load", timeout });
    return new Uint8Array(await page.pdf({ format: "A4",
      printBackground: true, timeout }));
  } finally {
    await ctx.close();
  }
}

/**
 * Headless Chrome through puppeteer-core: one browser, launched on
 * first use and reused; JavaScript off and every request that is not
 * a `data:` URL aborted. A failure logs no content and is a 500; it
 * closes only its own context (print's finally), so the shared browser
 * stays for the renders running beside it.
 */
function launchChrome(o: ChromeOptions): Promise<Browser> {
  return puppeteer.launch({ executablePath: o.executablePath,
    headless: true, args: [...(o.noSandbox ? ["--no-sandbox"] : []),
      "--disable-dev-shm-usage", "--no-first-run",
      // Belt and braces: any request that escapes interception (a
      // subframe navigation does) goes to a dead proxy, loopback too.
      "--proxy-server=127.0.0.1:9", "--proxy-bypass-list=<-loopback>"] });
}

export function chromeRenderer(o: ChromeOptions): ChromeRenderer {
  let browser: Promise<Browser> | null = null;
  const launch = () => browser ??= launchChrome(o);
  const close = async () => {
    const b = browser;
    browser = null;
    if (b !== null) await b.then((x) => x.close(), () => undefined);
  };
  /** Forget `b` only if it is still the current, and it has died. */
  const forgetIfDead = async (b: Promise<Browser>) => {
    const x = await b.catch(() => null);
    if (browser === b && (x === null || !x.connected)) browser = null;
  };
  const renderHtml = async (html: string) => {
    const b = launch();
    try {
      return await print(await b, html, o.timeoutMs);
    } catch (e) {
      o.log({ event: "pdf.render.failed",
        error: String((e as { name?: unknown })?.name ?? "unknown") });
      await forgetIfDead(b);
      throw new ApiError("INTERNAL");
    }
  };
  return {
    renderHtml,
    render: (page) => renderHtml(letterHtml(page, o.fontBase64)),
    close,
  };
}
