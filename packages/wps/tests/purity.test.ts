import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..", "src");

/** Files of the I/O shell; everything else under src is pure core. */
const SHELL = new Set(["cli.ts", "cli-args.ts", "main.ts",
  "batch-schema.ts", "shell.ts"]);

function listTs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return listTs(path);
    return e.name.endsWith(".ts") ? [path] : [];
  });
}

function isCore(path: string): boolean {
  return !SHELL.has(relative(SRC, path).split("\\").join("/"));
}

/** Drops comments; keeps "//" inside strings such as URLs. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");
}

/** Empties "..." and '...' literals, so message words are not code. */
function blankStrings(code: string): string {
  return code.replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''");
}

/** Import checks read string contents; the rest skip them. */
const IMPORTS: [string, RegExp][] = [
  ["node: import", /["']node:/],
  ["fs import", /from\s+["'](?:node:)?fs(?:\/promises)?["']/],
  ["zod import", /from\s+["']zod["']/],
];

const BANNED: [string, RegExp][] = [
  ["process.", /\bprocess\./],
  ["console.", /\bconsole\./],
  ["Date", /\bDate\b/],
  ["Math.random", /\bMath\.random\b/],
  ["fetch(", /\bfetch\s*\(/],
  ["require(", /\brequire\s*\(/],
];

function breaches(text: string): string[] {
  const code = stripComments(text);
  const bare = blankStrings(code);
  return [
    ...IMPORTS.filter(([, re]) => re.test(code)),
    ...BANNED.filter(([, re]) => re.test(bare)),
  ].map(([name]) => name);
}

const SPEC = /(?:from|import)\s*\(?\s*"([^"]+)"/g;

function specifiers(text: string): string[] {
  return [...stripComments(text).matchAll(SPEC)].map((m) => m[1] ?? "");
}

function resolveTs(from: string, spec: string): string {
  const base = join(dirname(from), spec);
  for (const p of [`${base}.ts`, join(base, "index.ts")]) {
    try {
      readFileSync(p);
      return p;
    } catch {
      // try the next candidate
    }
  }
  throw new Error(`cannot resolve ${spec} from ${from}`);
}

/** Every file reachable from entry, and every bare import seen. */
function reach(entry: string) {
  const files = new Set<string>();
  const bare = new Set<string>();
  const todo = [entry];
  while (todo.length > 0) {
    const file = todo.pop()!;
    if (files.has(file)) continue;
    files.add(file);
    for (const spec of specifiers(readFileSync(file, "utf8"))) {
      if (spec.startsWith(".")) todo.push(resolveTs(file, spec));
      else bare.add(spec);
    }
  }
  return { files, bare };
}

describe("pure core", () => {
  const all = listTs(SRC);
  const core = all.filter(isCore);
  it("the shell files exist and are skipped", () => {
    const names = all.map((f) => relative(SRC, f));
    for (const s of SHELL) expect(names, s).toContain(s);
    expect(core.length).toBeGreaterThan(10);
    expect(core.some((f) => f.endsWith("cli.ts"))).toBe(false);
  });
  it("the scanner flags planted breaches", () => {
    expect(breaches('import { x } from "node:fs";')).toEqual(
      ["node: import", "fs import"]);
    expect(breaches('import { readFile } from "fs";')).toEqual(
      ["fs import"]);
    expect(breaches('import { z } from "zod";')).toEqual(["zod import"]);
    expect(breaches("const t = new Date();")).toEqual(["Date"]);
    expect(breaches("process.exit(1); console.log(1);")).toEqual(
      ["process.", "console."]);
    expect(breaches("Math.random(); fetch(u); require(m);")).toEqual(
      ["Math.random", "fetch(", "require("]);
    expect(breaches('// new Date()\nconst u = "https://x";')).toEqual([]);
    expect(breaches("const createdDate = parseIsoDate(t);")).toEqual([]);
    expect(breaches('report("Date must be real");')).toEqual([]);
    expect(breaches('const s = "x"; new Date();')).toEqual(["Date"]);
  });
  it("core files use no clock, I/O, zod, randomness or globals", () => {
    for (const file of core) {
      expect(breaches(readFileSync(file, "utf8")), file).toEqual([]);
    }
  });
});

describe("package exports", () => {
  const pkg = JSON.parse(readFileSync(join(SRC, "..", "package.json"),
    "utf8")) as { name: string; exports: Record<string, string> };
  it("maps . to the pure barrel and ./shell to the shell", () => {
    expect(pkg.name).toBe("@payroll/wps");
    expect(pkg.exports).toEqual({ ".": "./src/index.ts",
      "./shell": "./src/shell.ts" });
  });
});

describe("pure barrel", () => {
  const { files, bare } = reach(join(SRC, "index.ts"));
  it("reaches the core modules only", () => {
    expect(files.size).toBeGreaterThan(10);
    for (const f of files) expect(isCore(f), f).toBe(true);
  });
  it("imports nothing but the pure engine", () => {
    expect([...bare]).toEqual(["@payroll/engine"]);
  });
  it("the shell barrel does reach zod and node:fs", () => {
    const shell = reach(join(SRC, "shell.ts"));
    expect(shell.bare.has("zod")).toBe(true);
    expect(shell.bare.has("node:fs/promises")).toBe(true);
  });
});
