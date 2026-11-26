import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..", "src");

/** Files of the I/O shell; everything else under src is pure core. */
const SHELL = new Set(["cli.ts", "cli-args.ts", "main.ts",
  "sample-schema.ts", "shell.ts"]);

function listTs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return listTs(path);
    return e.name.endsWith(".ts") ? [path] : [];
  });
}

function isCore(path: string): boolean {
  const rel = relative(SRC, path).split("\\").join("/");
  return !rel.startsWith("cases/") && !SHELL.has(rel);
}

/** Drops comments; keeps "//" inside strings such as URLs. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'\\])\/\/.*$/gm, "$1");
}

const BANNED: [string, RegExp][] = [
  ["node: import", /["']node:/],
  ["process.", /\bprocess\./],
  ["console.", /\bconsole\./],
  ["Date", /\bDate\b/],
  ["Math.random", /\bMath\.random\b/],
  ["fetch(", /\bfetch\s*\(/],
  ["require(", /\brequire\s*\(/],
];

function breaches(text: string): string[] {
  const code = stripComments(text);
  return BANNED.filter(([, re]) => re.test(code)).map(([name]) => name);
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
  const core = listTs(SRC).filter(isCore);
  it("scans many core files and skips the shell", () => {
    expect(core.length).toBeGreaterThan(10);
    expect(core.some((f) => f.endsWith("cli.ts"))).toBe(false);
    expect(core.some((f) => f.includes("cases"))).toBe(false);
  });
  it("scans the tax functions under src/tax", () => {
    const tax = core.filter((f) =>
      relative(SRC, f).split("\\").join("/").startsWith("tax/"));
    expect(tax.some((f) => f.endsWith("employee-expense.ts"))).toBe(true);
  });
  it("the scanner flags planted breaches", () => {
    expect(breaches('import { x } from "node:fs";')).toEqual(
      ["node: import"]);
    expect(breaches("const t = new Date();")).toEqual(["Date"]);
    expect(breaches("process.exit(1); console.log(1);")).toEqual(
      ["process.", "console."]);
    expect(breaches("Math.random(); fetch(u); require(m);")).toEqual(
      ["Math.random", "fetch(", "require("]);
    expect(breaches('// new Date()\nconst u = "https://x";')).toEqual([]);
    expect(breaches("const joiningDate = parseIsoDate(t);")).toEqual([]);
  });
  it("core files use no clock, I/O, randomness or globals", () => {
    for (const file of core) {
      expect(breaches(readFileSync(file, "utf8")), file).toEqual([]);
    }
  });
});

describe("package exports", () => {
  const pkg = JSON.parse(readFileSync(join(SRC, "..", "package.json"),
    "utf8")) as { name: string; exports: Record<string, string> };
  it("maps . to the pure barrel and ./shell to the shell", () => {
    expect(pkg.name).toBe("@payroll/engine");
    expect(pkg.exports).toEqual({ ".": "./src/index.ts",
      "./shell": "./src/shell.ts" });
    for (const target of Object.values(pkg.exports)) {
      expect(() => readFileSync(join(SRC, "..", target))).not.toThrow();
    }
  });
  it("resolves both entry points by package name", async () => {
    const core = await import("@payroll/engine");
    const shell = await import("@payroll/engine/shell");
    expect(typeof core.calculateSettlement).toBe("function");
    expect(typeof shell.runCases).toBe("function");
    expect("runCases" in core).toBe(false);
  });
});

describe("pure barrel", () => {
  const { files, bare } = reach(join(SRC, "index.ts"));
  it("reaches the engine modules", () => {
    expect(files.size).toBeGreaterThan(10);
    expect([...files].some((f) => f.endsWith("settlement.ts"))).toBe(true);
  });
  it("pulls in no node: module and no zod", () => {
    expect([...bare]).toEqual([]);
    for (const f of files) expect(isCore(f), f).toBe(true);
  });
  it("the shell barrel does reach the runner and zod", () => {
    const shell = reach(join(SRC, "shell.ts"));
    expect(shell.bare.has("zod")).toBe(true);
    expect(shell.bare.has("node:fs/promises")).toBe(true);
  });
});
