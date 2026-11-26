import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { Config } from "../config";
import type { Logger } from "../deps";
import { chromeRenderer } from "./chrome-renderer";
import { DEFAULT_RENDER_LIMITS, limitRenders } from "./limit";
import { unavailableRenderer, type PdfRenderer } from "./renderer";

/** DejaVu Sans (Latin and Arabic) as base64, embedded in each letter. */
export function dejavuBase64(): string {
  const path = createRequire(import.meta.url)
    .resolve("dejavu-fonts-ttf/ttf/DejaVuSans.ttf");
  return readFileSync(path).toString("base64");
}

/** Chrome when CHROME_PATH is set; otherwise letters answer 503. */
export function letterRenderer(cfg: Config, log: Logger): PdfRenderer {
  if (cfg.chromePath === null) return unavailableRenderer();
  return limitRenders(chromeRenderer({ executablePath: cfg.chromePath,
    noSandbox: cfg.chromeNoSandbox, fontBase64: dejavuBase64(),
    timeoutMs: 10_000, log }), DEFAULT_RENDER_LIMITS);
}
