import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "..", "src");

function listTs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return listTs(path);
    return e.name.endsWith(".ts") ? [path] : [];
  });
}

const files = listTs(SRC).map((f) => ({
  rel: relative(SRC, f).split("\\").join("/"),
  text: readFileSync(f, "utf8"),
}));

const HTTP = /from\s+["']node:(https?)["']/;
const DNS = /from\s+["']node:dns(\/promises)?["']/;

/** Tests never touch the network: network modules live in two files. */
describe("network modules", () => {
  it("the patterns catch planted imports", () => {
    expect(HTTP.test('import { request } from "node:https";')).toBe(true);
    expect(HTTP.test('import http from "node:http";')).toBe(true);
    expect(DNS.test('import { lookup } from "node:dns/promises";'))
      .toBe(true);
  });
  it("fetch( appears in no source file", () => {
    for (const f of files) expect(f.text.includes("fetch("), f.rel)
      .toBe(false);
  });
  it("only channels/http-node.ts imports node:http(s)", () => {
    for (const f of files.filter((x) => HTTP.test(x.text))) {
      expect(f.rel).toBe("channels/http-node.ts");
    }
  });
  it("only channels/dns.ts imports node:dns", () => {
    for (const f of files.filter((x) => DNS.test(x.text))) {
      expect(f.rel).toBe("channels/dns.ts");
    }
  });
});
