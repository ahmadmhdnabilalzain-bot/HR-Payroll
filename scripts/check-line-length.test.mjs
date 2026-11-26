import assert from "node:assert/strict";
import { test } from "node:test";
import { findLongLines, isChecked } from "./check-line-length.mjs";

test("flags lines over the limit with 1-based numbers", () => {
  const text = "a\n" + "x".repeat(81) + "\n";
  assert.deepEqual(findLongLines(text, 80), [2]);
});

test("accepts lines of exactly 80 characters", () => {
  const text = "x".repeat(80) + "\n" + "y".repeat(80) + "\n";
  assert.deepEqual(findLongLines(text, 80), []);
});

test("checks SQL migrations and skips lockfiles", () => {
  assert.equal(isChecked("001_tenancy.sql"), true);
  assert.equal(isChecked("pnpm-lock.yaml"), false);
});
