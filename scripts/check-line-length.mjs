import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MAX = 80;
export const ROOTS = ["packages", "scripts", "apps"];
const EXTENSIONS = new Set([
  ".ts", ".tsx", ".css", ".html", ".json", ".mjs", ".md",
]);
const SKIP_DIRS = new Set([
  "node_modules", "dist", ".superpowers", "test-results",
  "playwright-report",
]);
const SKIP_FILES = new Set([
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
]);

export function findLongLines(text, max) {
  const hits = [];
  text.split("\n").forEach((line, index) => {
    if (line.replace(/\r$/, "").length > max) hits.push(index + 1);
  });
  return hits;
}

export function listFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) out.push(...listFiles(path));
    } else if (isChecked(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

function isChecked(name) {
  return !SKIP_FILES.has(name) && EXTENSIONS.has(extname(name));
}

function runCli() {
  let failures = 0;
  for (const root of ROOTS) {
    for (const file of listFiles(root)) {
      const lines = findLongLines(readFileSync(file, "utf8"), MAX);
      for (const n of lines) {
        console.error(`${file}:${n} exceeds ${MAX} characters`);
        failures += 1;
      }
    }
  }
  if (failures > 0) process.exit(1);
  console.log(`line length ok (max ${MAX})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) runCli();
