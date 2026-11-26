import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDemoData } from "../../src/demo/data/adapter";
import { INITIAL, type Role } from "../../src/demo/state";
import { areasFor, mayOpen, routeOf } from "../../src/nav/registry";
import { findMoney } from "../../src/ui/moneyScan";
import { MONEY_MASK, maskMoney } from "../../src/ui/mask";

const ROLES: readonly Role[] = ["hr", "gm", "manager", "employee", "it"];
const FILE = resolve(process.cwd(), "e2e/leak-routes.json");

/** Every route a role may open: the registry's areas, plus a few
 * record pages that no area names, kept only if the guard lets in. */
function routesOf(role: Role): string[] {
  const data = buildDemoData();
  const c = { data, state: { ...INITIAL, role } };
  const hash = (s: string, rest: string[] = []): string =>
    "#/" + [s, ...rest].join("/");
  const out = ["#/"];
  for (const a of areasFor(role)) {
    const r = routeOf(a, c);
    if (mayOpen(role, r)) out.push(hash(r.section, r.rest));
  }
  const ids = data.employees().slice(0, 3).map((e) => e.id);
  for (const id of ids) {
    out.push(hash("people", [id]), hash("people", [id, "payslip"]),
      hash("pay-run", ["settlements", id]));
  }
  out.push(hash("pay-run", ["fix"]), hash("reports", ["inspection", "room"]));
  return [...new Set(out)].filter((h) => {
    const [section, ...rest] = h.replace(/^#\/?/, "").split("/");
    return h === "#/" || mayOpen(role, { section: section as never, rest });
  });
}

describe("the route list the leak scan walks", () => {
  const now = Object.fromEntries(ROLES.map((r) => [r, routesOf(r)]));

  it("is up to date (LEAK_ROUTES_WRITE=1 rewrites e2e/leak-routes.json)",
    () => {
      if (process.env["LEAK_ROUTES_WRITE"] === "1") {
        writeFileSync(FILE, JSON.stringify(now, null, 1) + "\n");
      }
      expect(JSON.parse(readFileSync(FILE, "utf8"))).toEqual(now);
    });
});

describe("the shared money finder", () => {
  it("flags a figure and passes the mask", () => {
    for (const t of ["AED 933,730.94", "د.إ 1,200", "933,730.94",
      "paid 12500 net", "1,000", "−AED 5", "AED 25"]) {
      expect([t, findMoney(t).length > 0]).toEqual([t, true]);
    }
    for (const t of [MONEY_MASK, "Amount (AED)", "27 Oct 2026", "2.4%",
      "22.5 days", "31 people", "Page 2 of 40", "emp-0001"]) {
      expect([t, findMoney(t)]).toEqual([t, []]);
    }
  });

  it("maskMoney leaves nothing the finder flags", () => {
    const t = "Net AED 933,730.94 and 4,950.00, +AED 5.00 or AED 1,000.";
    expect(findMoney(maskMoney(t))).toEqual([]);
  });
});
