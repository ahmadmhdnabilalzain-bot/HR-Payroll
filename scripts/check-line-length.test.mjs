import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import {
  findLongLines,
  listFiles,
  ROOTS,
} from "./check-line-length.mjs";

test("flags lines over the limit with 1-based numbers", () => {
  const text = "a\n" + "x".repeat(81) + "\n";
  assert.deepEqual(findLongLines(text, 80), [2]);
});

test("accepts lines of exactly 80 characters", () => {
  const text = "x".repeat(80) + "\n" + "y".repeat(80) + "\n";
  assert.deepEqual(findLongLines(text, 80), []);
});

function tree(files) {
  const dir = mkdtempSync(join(tmpdir(), "lines-"));
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), text);
  }
  return dir;
}

for (const ext of [".tsx", ".css", ".html"]) {
  test(`checks ${ext} files`, () => {
    const dir = tree({ [`a${ext}`]: "x" });
    assert.deepEqual(listFiles(dir), [join(dir, `a${ext}`)]);
  });
}

test("skips test output folders", () => {
  const dir = tree({
    "test-results/a.ts": "x",
    "playwright-report/b.html": "x",
  });
  assert.deepEqual(listFiles(dir), []);
});

test("covers the apps folder", () => {
  assert.ok(ROOTS.includes("apps"));
});

test("a missing root lists nothing", () => {
  assert.deepEqual(listFiles(join(tmpdir(), "no-such-dir-xyz")), []);
});
