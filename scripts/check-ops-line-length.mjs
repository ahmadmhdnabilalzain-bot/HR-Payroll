/**
 * 80-character check for the operations files the main checker does
 * not cover: every file (any extension, dotfiles included) under
 * deploy/, docs/ops/ and .github/. Reuses findLongLines.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { findLongLines } from "./check-line-length.mjs";

const MAX = 80;
export const OPS_ROOTS = ["deploy", "docs/ops", ".github"];
const SKIP_DIRS = new Set(["node_modules", "dist"]);

export function listAllFiles(dir) {
  if (!existsSync(dir)) return [];
  if (statSync(dir).isFile()) return [dir];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) out.push(...listAllFiles(path));
    } else if (entry.isFile()) out.push(path);
  }
  return out;
}

function runCli() {
  let failures = 0;
  for (const root of OPS_ROOTS) {
    for (const file of listAllFiles(root)) {
      for (const n of findLongLines(readFileSync(file, "utf8"), MAX)) {
        console.error(`${file}:${n} exceeds ${MAX} characters`);
        failures += 1;
      }
    }
  }
  if (failures > 0) process.exit(1);
  console.log(`ops line length ok (max ${MAX})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) runCli();
