#!/usr/bin/env node
// Lists every Arabic-script string in the repo, with file and line, so the
// native-review pack can be checked and regenerated. Plain node, no
// dependencies. Read-only: it never changes a source file.
//
// Usage (from anywhere):
//   node docs/review/scan-arabic.mjs                 text listing + summary
//   node docs/review/scan-arabic.mjs --format tsv    file<TAB>line<TAB>...
//   node docs/review/scan-arabic.mjs --format json   machine readable
//   node docs/review/scan-arabic.mjs --summary       counts only
//   node docs/review/scan-arabic.mjs --check docs/review/arabic-review-pack.md
//       exits 1 if any Arabic run found in the repo is missing from the pack
//   node docs/review/scan-arabic.mjs --root DIR      scan another directory
//
// "hit" = one source line holding Arabic letters, Arabic-Indic digits or
// punctuation, \u06xx escapes or bidi control characters. "run" = a maximal
// run of Arabic words on that line. "string" = a quoted literal holding Arabic.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

// Arabic, Arabic Supplement, Arabic Extended-A, Presentation Forms A and B.
const AR_CLASS = "\\u0600-\\u06FF\\u0750-\\u077F\\u08A0-\\u08FF" +
  "\\uFB50-\\uFDFF\\uFE70-\\uFEFC";
// Letters only (no digits, punctuation): decides whether a line "has Arabic".
const AR_LETTER = new RegExp(
  "[\\u0620-\\u064A\\u066E-\\u06D3\\u06FA-\\u06FF\\u0750-\\u077F" +
  "\\u08A0-\\u08FF\\uFB50-\\uFDFF\\uFE70-\\uFEFC]");
const AR_WORD = `[${AR_CLASS}]+`;
const RUN = new RegExp(`${AR_WORD}(?: ${AR_WORD})*`, "g");
// Source files that spell Arabic as \u06xx escapes.
const ESCAPE = new RegExp(
  "\\\\u(?:06[0-9A-Fa-f]{2}|07[5-7][0-9A-Fa-f]|08[A-Fa-f][0-9A-Fa-f]" +
  "|\\{0?6[0-9A-Fa-f]{2}\\})");
// Bidirectional control characters, literal or escaped.
const BIDI_LIT = /[\u200E\u200F\u202A-\u202E\u2066-\u2069\u061C]/;
const BIDI_ESC = /\\u(?:200[EeFf]|202[A-Ea-e]|206[6-9]|061[Cc])/;
const EASTERN_DIGIT = /[٠-٩۰-۹]/;
const ARABIC_PUNCT = /[،؛؟٪-٬]/;
const LATIN = /[A-Za-z]/;
const QUOTED =
  /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;

// Words that could read as approval, compliance, certification or a legal
// conclusion. A hit here is a prompt for the reviewer, never a verdict.
const CLAIM_WORDS = [
  "معتمد", "اعتماد", "اعتمد", "يعتمد", "مطابق", "متوافق",
  "موافق", "رسمي", "قانون", "نظامي", "شرعي", "ملزم", "إلزامي", "مرخص",
  "مصدق", "شهادة", "معايير", "يجوز", "لا يجوز", "مستحق", "حكم قضائي",
  "المادة", "مرسوم", "وزارة", "توقيع", "تشريع", "افتراضي",
];

const SKIP_DIRS = new Set([
  "node_modules", "dist", ".git", ".claude", ".superpowers", "test-results",
  "playwright-report", "coverage", ".next", ".turbo", ".vite",
]);
const BINARY = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".woff",
  ".woff2", ".ttf", ".otf", ".zip", ".gz", ".db", ".sqlite", ".mp3",
  ".mp4", ".wav", ".lock",
]);

/** Which part of the product a path belongs to. */
export function areaOf(path) {
  const p = path.split(sep).join("/");
  if (/(^|\/)(tests?|e2e)\//.test(p) || /\.(test|spec)\.\w+$/.test(p)) {
    return "tests";
  }
  if (p.startsWith("docs/") || p.endsWith(".md")) return "docs";
  if (p.startsWith("packages/engine/src/explain/")) return "engine-explain";
  if (p.startsWith("apps/web/src/i18n/")) return "web-i18n";
  if (p.startsWith("apps/web/src/api/mock/")) return "web-mock-seed";
  if (p === "apps/web/src/brand.ts") return "web-brand";
  if (p.startsWith("packages/contract/")) return "contract";
  if (p.startsWith("packages/api/src/")) return "api";
  if (p.startsWith("packages/")) return "packages-other";
  if (p.startsWith("apps/")) return "web-other";
  return "other";
}

function* walk(dir, root) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      // The pack and this script must not feed themselves.
      if (relative(root, full).split(sep).join("/") === "docs/review") {
        continue;
      }
      yield* walk(full, root);
    } else if (e.isFile()) {
      const dot = e.name.lastIndexOf(".");
      if (dot !== -1 && BINARY.has(e.name.slice(dot))) continue;
      yield full;
    }
  }
}

/** Flags for the quoted strings (or the whole line when prose). */
function flagsOf(text, bidi) {
  const f = [];
  if (EASTERN_DIGIT.test(text)) f.push("eastern-digits");
  if (/[0-9]/.test(text)) f.push("western-digits");
  if (/\{[\w.]+\}/.test(text)) f.push("placeholder");
  if (LATIN.test(text.replace(/\{[\w.]+\}/g, ""))) f.push("latin-in-arabic");
  if (ARABIC_PUNCT.test(text)) f.push("arabic-punct");
  if (bidi) f.push("bidi-control");
  const claims = CLAIM_WORDS.filter((w) => text.includes(w));
  if (claims.length > 0) f.push("claim:" + claims.join("|"));
  return f;
}

/** All hits in one file. */
export function scanText(text, file) {
  const hits = [];
  text.split(/\r?\n/).forEach((line, i) => {
    const hasLetters = AR_LETTER.test(line);
    const esc = ESCAPE.test(line);
    const bidi = BIDI_LIT.test(line) || BIDI_ESC.test(line);
    const digits = EASTERN_DIGIT.test(line);
    const punct = ARABIC_PUNCT.test(line);
    if (!hasLetters && !esc && !bidi && !digits && !punct) return;
    const strings = [];
    for (const m of line.matchAll(QUOTED)) {
      const s = m[1] ?? m[2] ?? m[3] ?? "";
      if (AR_LETTER.test(s)) strings.push(s);
    }
    const runs = hasLetters ? line.match(RUN) ?? [] : [];
    hits.push({
      file, line: i + 1,
      kind: hasLetters ? (strings.length > 0 ? "string" : "prose")
        : digits ? "digits" : punct ? "punct" : esc ? "escape" : "bidi",
      text: line.trim(), strings, runs,
      flags: flagsOf(strings.length > 0 ? strings.join(" ") : line, bidi),
      escapes: esc, bidi,
    });
  });
  return hits;
}

export function scanRepo(root) {
  const hits = [];
  for (const full of walk(root, root)) {
    let text;
    try {
      if (statSync(full).size > 4_000_000) continue;
      text = readFileSync(full, "utf8");
    } catch { continue; }
    const rel = relative(root, full).split(sep).join("/");
    for (const h of scanText(text, rel)) {
      hits.push({ ...h, area: areaOf(rel) });
    }
  }
  hits.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1
    : a.line - b.line);
  return hits;
}

function summary(hits) {
  const byArea = {};
  const byFile = {};
  for (const h of hits) {
    const a = (byArea[h.area] ??= { lines: 0, runs: 0, files: new Set() });
    a.lines += 1; a.runs += h.runs.length; a.files.add(h.file);
    byFile[h.file] = (byFile[h.file] ?? 0) + 1;
  }
  return { byArea, byFile };
}

function printSummary(hits) {
  const { byArea, byFile } = summary(hits);
  console.log("\n== Summary by area (lines with Arabic / Arabic runs) ==");
  for (const [a, v] of Object.entries(byArea).sort()) {
    console.log(`${a.padEnd(16)} files ${String(v.files.size).padStart(3)}` +
      `  lines ${String(v.lines).padStart(4)}  runs ${v.runs}`);
  }
  console.log("\n== Summary by file ==");
  for (const [f, n] of Object.entries(byFile).sort()) {
    console.log(`${String(n).padStart(4)}  ${f}`);
  }
  const esc = hits.filter((h) => h.kind === "escape");
  const bidi = hits.filter((h) => h.bidi);
  console.log(`\nEscaped (\\u06xx) Arabic, not literal text: ${esc.length}`);
  for (const h of esc) console.log(`  ${h.file}:${h.line}`);
  console.log(`Lines with bidi control characters: ${bidi.length}`);
  for (const h of bidi) console.log(`  ${h.file}:${h.line} (${h.area})`);
  const eastern = hits.filter((h) => h.flags.includes("eastern-digits"));
  console.log(`Lines with Arabic-Indic digits: ${eastern.length}`);
  for (const h of eastern) console.log(`  ${h.file}:${h.line} (${h.area})`);
}

function norm(s) {
  return s.replace(/\s+/g, " ").trim();
}

/** Runs of `hits` that the pack text does not contain. */
export function missingFromPack(hits, packText) {
  const hay = norm(packText);
  const missing = [];
  for (const h of hits) {
    for (const r of h.runs) {
      if (norm(r) !== "" && !hay.includes(norm(r))) {
        missing.push({ ...h, run: r });
      }
    }
  }
  return missing;
}

function main(argv) {
  const opt = { format: "text", summary: false, root: resolve(HERE, "../.."),
    check: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--format") opt.format = argv[++i];
    else if (a === "--summary") opt.summary = true;
    else if (a === "--root") opt.root = resolve(argv[++i]);
    else if (a === "--check") opt.check = resolve(argv[++i]);
    else { console.error(`unknown option ${a}`); process.exit(2); }
  }
  const hits = scanRepo(opt.root);
  if (opt.check !== null) {
    const missing = missingFromPack(hits, readFileSync(opt.check, "utf8"));
    for (const m of missing) {
      console.log(`MISSING ${m.file}:${m.line} [${m.area}] ${m.run}`);
    }
    console.log(`${hits.length} lines scanned, ${missing.length} Arabic ` +
      `runs missing from ${relative(process.cwd(), opt.check)}`);
    process.exit(missing.length === 0 ? 0 : 1);
  }
  if (opt.format === "json") {
    console.log(JSON.stringify(hits, null, 2));
    return;
  }
  if (!opt.summary) {
    for (const h of hits) {
      if (opt.format === "tsv") {
        console.log([h.file, h.line, h.area, h.kind, h.flags.join(","),
          h.text.replace(/\t/g, " ")].join("\t"));
      } else {
        const fl = h.flags.length > 0 ? `  [${h.flags.join(" ")}]` : "";
        console.log(`${h.file}:${h.line} (${h.area}, ${h.kind}) ` +
          `${h.text}${fl}`);
      }
    }
  }
  if (opt.format !== "tsv") printSummary(hits);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
