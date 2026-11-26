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

/** Source with comments removed; `bare` also has literals emptied. */
interface Scanned {
  readonly kept: string;
  readonly bare: string;
}

const REGEX_AFTER_PUNCT = /[(,=:[!&|?{};+\-*%<>~^]$/;
const REGEX_AFTER_WORD = new RegExp(
  "(?:^|[^\\w$.])(?:return|typeof|case|void|delete|in|of|new|throw|" +
    "else|do|yield|await)$",
);

/** True when a `/` here starts a regex literal, not a division. */
function regexAllowed(bare: string): boolean {
  const t = bare.trimEnd().slice(-12);
  return t === "" || REGEX_AFTER_PUNCT.test(t) || REGEX_AFTER_WORD.test(t);
}

/**
 * One left-to-right pass over the source. Comments (line, and block
 * across lines), "..." '...' strings, template literals (with their
 * `${}` code) and regex literals are each recognised as a token, so a
 * quote inside a regex or a comment marker inside a string cannot hide
 * code. `kept` keeps literals (import specifiers are read from it);
 * `bare` has them emptied (banned names are read from it).
 */
function scan(src: string): Scanned {
  let kept = "";
  let bare = "";
  const braces: number[] = [];
  let i = 0;
  let inTemplate = false;
  const both = (k: string, b: string): void => {
    kept += k;
    bare += b;
  };
  const quoted = (q: string): void => {
    let j = i + 1;
    while (j < src.length && src[j] !== q && src[j] !== "\n") {
      j += src[j] === "\\" ? 2 : 1;
    }
    both(src.slice(i, j + 1), q + q);
    i = j + 1;
  };
  const template = (): void => {
    let j = i;
    while (j < src.length && src[j] !== "`" && !src.startsWith("${", j)) {
      j += src[j] === "\\" ? 2 : 1;
    }
    if (src.startsWith("${", j)) {
      both(src.slice(i, j + 2), "`` ");
      braces.push(0);
      inTemplate = false;
      i = j + 2;
    } else {
      both(src.slice(i, j + 1), "``");
      inTemplate = false;
      i = j + 1;
    }
  };
  const regex = (): void => {
    let j = i + 1;
    let cls = false;
    while (j < src.length && src[j] !== "\n" && (cls || src[j] !== "/")) {
      if (src[j] === "\\") j++;
      else if (src[j] === "[") cls = true;
      else if (src[j] === "]") cls = false;
      j++;
    }
    both(src.slice(i, j + 1), "/ /");
    i = j + 1;
  };
  while (i < src.length) {
    const c = src[i]!;
    if (inTemplate) template();
    else if (src.startsWith("//", i)) {
      while (i < src.length && src[i] !== "\n") i++;
    } else if (src.startsWith("/*", i)) {
      const end = src.indexOf("*/", i + 2);
      i = end === -1 ? src.length : end + 2;
      both(" ", " ");
    } else if (c === '"' || c === "'") quoted(c);
    else if (c === "`") {
      both("`", "");
      i++;
      inTemplate = true;
    } else if (c === "/" && regexAllowed(bare)) regex();
    else {
      if (c === "{" && braces.length > 0) braces[braces.length - 1]!++;
      if (c === "}" && braces.length > 0) {
        if (braces[braces.length - 1] === 0) {
          braces.pop();
          inTemplate = true;
        } else braces[braces.length - 1]!--;
      }
      both(c, c);
      i++;
    }
  }
  return { kept, bare };
}

/** Import checks read literals (from `kept`); the rest do not. */
const IMPORTS: [string, RegExp][] = [
  ["node: import", /["'`]node:/],
  ["fs import",
    /(?:from|import)\s*\(?\s*["'`](?:node:)?fs(?:\/promises)?["'`]/],
  ["zod import", /(?:from|import)\s*\(?\s*["'`]zod["'`]/],
];

const BANNED: [string, RegExp][] = [
  ["process", /\bprocess\b/],
  ["console", /\bconsole\b/],
  ["Date", /\bDate\b/],
  ["Intl", /\bIntl\b/],
  ["performance", /\bperformance\b/],
  ["Temporal", /\bTemporal\b/],
  ["timers", /\b(?:setTimeout|setInterval|setImmediate)\b/],
  ["crypto", /\bcrypto\b/],
  ["globalThis", /\bglobalThis\b|(?<![.\w$])global\b/],
  ["Math.random", /\bMath\.random\b/],
  ["fetch(", /\bfetch\s*\(/],
  ["require(", /\brequire\s*\(/],
  ["dynamic import", /\bimport\s*\(/],
];

function breaches(text: string): string[] {
  const { kept, bare } = scan(text);
  return [
    ...IMPORTS.filter(([, re]) => re.test(kept)),
    ...BANNED.filter(([, re]) => re.test(bare)),
  ].map(([name]) => name);
}

const SPEC = /(?:from|import)\s*\(?\s*["'`]([^"'`]+)["'`]/g;

function specifiers(text: string): string[] {
  return [...scan(text).kept.matchAll(SPEC)].map((m) => m[1] ?? "");
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
    expect(breaches('import { readFile } from "fs/promises";')).toEqual(
      ["fs import"]);
    expect(breaches('import { z } from "zod";')).toEqual(["zod import"]);
    expect(breaches("import { z } from 'zod';")).toEqual(["zod import"]);
    expect(breaches("import 'zod';")).toEqual(["zod import"]);
    expect(breaches("const t = new Date();")).toEqual(["Date"]);
    expect(breaches("process.exit(1); console.log(1);")).toEqual(
      ["process", "console"]);
    expect(breaches("Math.random(); fetch(u); require(m);")).toEqual(
      ["Math.random", "fetch(", "require("]);
  });
  it("the scanner flags the names the old denylist missed", () => {
    const cases: [string, string][] = [
      ["new Intl.DateTimeFormat().format()", "Intl"],
      ["performance.now()", "performance"],
      ["Temporal.Now.instant()", "Temporal"],
      ["setTimeout(f, 1)", "timers"],
      ["setInterval(f, 1)", "timers"],
      ["crypto.randomUUID()", "crypto"],
      ['globalThis["Date"]', "globalThis"],
      ["global['Date']", "globalThis"],
      ["const d = new (globalThis as any).Date();", "globalThis"],
    ];
    for (const [code, name] of cases) {
      expect(breaches(code), code).toContain(name);
    }
    expect(breaches("const m = await import('zod');")).toEqual(
      ["zod import", "dynamic import"]);
    expect(breaches("await import(name);")).toEqual(["dynamic import"]);
    expect(breaches("import('node:fs')")).toEqual(
      ["node: import", "fs import", "dynamic import"]);
  });
  it("comment markers inside strings cannot hide code", () => {
    expect(breaches('"/*"; new Date(); "*/"')).toEqual(["Date"]);
    const multi = 'const a = "/*";\nnew Date();\nprocess.exit(1);\n' +
      'const b = "*/";';
    expect(breaches(multi)).toEqual(["process", "Date"]);
    expect(breaches("const a = '//'; new Date();")).toEqual(["Date"]);
    expect(breaches("const a = `/*`;\nnew Date();\n`*/`;")).toEqual(
      ["Date"]);
  });
  it("a quote inside a regex literal cannot desync the scan", () => {
    expect(breaches('x.replace(/"/g, ""); new Date(); "a"')).toEqual(
      ["Date"]);
    expect(breaches("x.replace(/'/g, ''); new Date(); 'a'")).toEqual(
      ["Date"]);
    expect(breaches('x.split(/["\']/); new Date();')).toEqual(["Date"]);
    expect(breaches('const r = /\\/"/; process.exit(1); "x"')).toEqual(
      ["process"]);
    expect(breaches("const half = (a + b) / 2; new Date(); // 2/3"))
      .toEqual(["Date"]);
  });
  it("code inside a template placeholder is still scanned", () => {
    expect(breaches("const s = `now ${new Date()}`;")).toEqual(["Date"]);
    expect(breaches("const s = `a ${f({ k: 1 })} ${process.pid}`;"))
      .toEqual(["process"]);
    expect(breaches("const s = `a Date b`;")).toEqual([]);
  });
  it("comments and literal words are not code", () => {
    expect(breaches('// new Date()\nconst u = "https://x";')).toEqual([]);
    expect(breaches("/* a\n new Date()\n process.exit */ const a = 1;"))
      .toEqual([]);
    expect(breaches("const createdDate = parseIsoDate(t);")).toEqual([]);
    expect(breaches('report("Date must be real");')).toEqual([]);
    expect(breaches("const a = /Date/.test(x);")).toEqual([]);
    expect(breaches('const s = "x"; new Date();')).toEqual(["Date"]);
    expect(breaches("// it's a comment\nnew Date();")).toEqual(["Date"]);
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
