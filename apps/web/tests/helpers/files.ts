import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export const WEB_ROOT = join(import.meta.dirname, "..", "..");

/** Files under a folder of apps/web, paths relative to apps/web. */
export function filesUnder(dir: string, exts: readonly string[]): string[] {
  const out: string[] = [];
  const walk = (abs: string): void => {
    for (const name of readdirSync(abs)) {
      const p = join(abs, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (exts.some((e) => name.endsWith(e))) {
        out.push(relative(WEB_ROOT, p));
      }
    }
  };
  walk(join(WEB_ROOT, dir));
  return out.sort();
}

export function readWeb(path: string): string {
  return readFileSync(join(WEB_ROOT, path), "utf8");
}
