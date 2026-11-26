/**
 * Fails when a Vitest JSON report shows skipped, failed or no tests.
 * The real-PostgreSQL suite skips itself without DATABASE_URL, which
 * would otherwise give a green CI job that tested nothing.
 *
 *   node scripts/assert-tests-ran.mjs <vitest-json-report>
 */
import { readFileSync } from "node:fs";

const path = process.argv[2];
if (path === undefined) {
  console.error("usage: assert-tests-ran.mjs <vitest-json-report>");
  process.exit(2);
}
const r = JSON.parse(readFileSync(path, "utf8"));
const skipped = (r.numPendingTests ?? 0) + (r.numTodoTests ?? 0);
const summary = `${r.numPassedTests} passed, ${r.numFailedTests} ` +
  `failed, ${skipped} skipped of ${r.numTotalTests}`;
if (r.numTotalTests === 0 || r.numPassedTests === 0) {
  console.error(`no tests ran (${summary})`);
  process.exit(1);
}
if (skipped > 0 || r.numFailedTests > 0 || r.success === false) {
  console.error(`not every test ran and passed (${summary})`);
  process.exit(1);
}
console.log(`tests ran: ${summary}`);
