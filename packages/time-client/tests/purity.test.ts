import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..", "src");
const files = readdirSync(SRC).filter((f) => f.endsWith(".ts"));
const BANNED = [/Date\.now/, /new Date\(\)/, /\bnavigator\b/, /\bwindow\b/,
  /\bdocument\b/, /setTimeout/, /setInterval/, /fetch\(/, /localStorage/,
  /from\s+["']node:/];

describe("time-client purity", () => {
  it("scans the files", () => expect(files.length).toBeGreaterThan(6));
  it("no clock, browser global, timer, network or node import", () => {
    for (const f of files) {
      const t = readFileSync(join(SRC, f), "utf8");
      for (const re of BANNED) expect(re.test(t), `${f} ${re}`).toBe(false);
    }
  });
  it("capture words only in desktop-agent.ts as false keys", () => {
    for (const f of files) {
      const t = readFileSync(join(SRC, f), "utf8").toLowerCase();
      const hit = /screenshot|keystroke|keylog/.test(t);
      expect(hit, f).toBe(f === "desktop-agent.ts");
    }
  });
});
