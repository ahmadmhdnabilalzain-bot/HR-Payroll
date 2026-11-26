import { describe, expect, it } from "vitest";
import { buildDemoData, buildDemoSource } from "../../src/demo/data/adapter";
import { clean } from "../../src/demo/data/home";
import {
  INITIAL,
  reduce,
  type DemoState,
  type Role,
} from "../../src/demo/state";
import { canSeePay, personFor, visibleIds } from "../../src/demo/time-off";
import {
  inboxNotes,
  inboxTasks,
  targetHref,
  unreadCount,
} from "../../src/home/inbox/model";
import { barFor } from "../../src/nav/registry";

const ROLES: Role[] = ["hr", "gm", "it", "manager", "employee"];
const BANNED = /\b(compliant|approved|certified|guaranteed)\b/i;
const d = buildDemoData();
const as = (role: Role, more: Partial<DemoState> = {}): DemoState =>
  ({ ...INITIAL, role, ...more });

describe("home inbox (WP10)", () => {
  it("shows-no-claim-words-for-any-role", () => {
    const it = d.home.it();
    const shown = ROLES.flatMap((r) => [
      ...d.home.tasks(r).flatMap((x) => [x.title, x.detail, x.dueText]),
      ...d.home.notifications(r).flatMap((x) => [x.title, x.body]),
      ...d.home.notices(r).flatMap((x) => [x.title, x.body,
        x.audienceText]),
    ]).concat(it.review.text, it.importText,
      ...it.hooks.flatMap((h) => [h.name, h.statusText]),
      ...it.keys.flatMap((k) => [k.name, k.scopesText]));
    expect(shown.filter((x) => BANNED.test(x))).toEqual([]);
    expect(clean("You approved the offer")).toBe("You signed off the offer");
  });

  it("it-role-sees-the-directory-but-no-pay", () => {
    const s = as("it");
    const me = personFor(d, "it");
    expect(d.people.person(me)?.role.en).toMatch(/IT/);
    expect(visibleIds(d, s)).toHaveLength(d.people.people().length);
    const other = d.people.people().find((p) => p.id !== me)!;
    expect(canSeePay(d, s, other.id)).toBe(false);
    expect(canSeePay(d, s, me)).toBe(true);
    expect(barFor("it")).toContain("people");
    expect(barFor("it")).not.toContain("pay");
    expect(barFor("it")).toEqual(["home", "people", "time", "reports",
      "setup"]);
  });

  it("leaves-decisions-and-bank-details-to-their-own-rows", () => {
    for (const r of ROLES) {
      const kinds = inboxTasks(d, as(r)).map((x) => x.source.kind);
      expect(kinds).not.toContain("approval");
      expect(kinds).not.toContain("issue");
    }
  });

  it("marks-a-task-done-and-undoes-it", () => {
    const s0 = as("it");
    const first = inboxTasks(d, s0).find((x) => !x.done)!;
    const s1 = reduce(s0, { type: "task-done", id: first.id });
    const after = inboxTasks(d, s1).find((x) => x.id === first.id)!;
    expect(after.done && after.doneHere).toBe(true);
    expect(after.tone).toBe("done");
    expect(inboxTasks(d, s1).at(-1)?.done).toBe(true);
    const s2 = reduce(s1, { type: "task-undone", id: first.id });
    expect(inboxTasks(d, s2).find((x) => x.id === first.id)?.done)
      .toBe(false);
  });

  it("holds-pay-run-notes-while-bank-details-block-it", () => {
    const src = buildDemoSource();
    const base = src.at({});
    const runNote = (data: typeof base, r: Role) => inboxNotes(data,
      as(r)).filter((n) => n.source.kind === "approval" &&
      n.source.id === base.approvalsInbox().find((a) =>
        a.kind === "pay-run")?.id);
    expect(runNote(base, "gm")).toEqual([]);
    expect(runNote(base, "hr")).toEqual([]);
    const ibans = Object.fromEntries([...base.heldIds(),
      ...base.badIbanIds()].map((id) => [id, src.bankLetterIban(id)]));
    const fixed = src.at(ibans);
    expect(fixed.heldIds()).toEqual([]);
    expect(runNote(fixed, "gm")).toHaveLength(1);
    expect(runNote(fixed, "gm")[0]?.unread).toBe(true);
  });

  it("reads-notes-and-counts-unread", () => {
    const s0 = as("employee");
    const n = unreadCount(d, s0);
    expect(n).toBeGreaterThan(0);
    const ids = inboxNotes(d, s0).map((x) => x.id);
    const s1 = reduce(s0, { type: "notes-read", ids });
    expect(unreadCount(d, s1)).toBe(0);
    expect(unreadCount(d, reduce(s1, { type: "notes-unread", ids })))
      .toBe(n);
  });

  it("links-only-to-reachable-screens", () => {
    const hr = { data: d, state: as("hr") };
    expect(targetHref("pay/this-month", hr)).toBe("#/pay-run/review");
    expect(targetHref("people/papers", hr)).toBe("#/reports/documents");
    expect(targetHref("approvals/ap-001", hr)).toBe("#/pay-run/approve");
    expect(targetHref("nowhere/at/all", hr)).toBeNull();
    const it = { data: d, state: as("it") };
    expect(targetHref("pay/this-month", it)).toBeNull();
    const emp = { data: d, state: as("employee") };
    expect(targetHref("people/papers", emp)).toBe("#/me/documents");
    expect(targetHref("me/documents/doc-001", emp)).toBe("#/me/documents");
    expect(targetHref("me/payslips", emp)).toBe("#/me/payslips");
    expect(barFor("employee")).toEqual(["home", "pay", "time", "requests",
      "me"]);
    for (const r of ROLES) {
      for (const x of inboxTasks(d, as(r))) {
        if (x.href !== null) expect(x.href).toMatch(/^#\//);
      }
    }
  });

  it("checks-the-audit-chain", () => {
    const it = d.home.it();
    expect(it.auditCount).toBeGreaterThan(0);
    expect(it.verifyChain()).toEqual({ ok: true, brokenAt: null,
      checked: it.auditCount });
  });

  it("lists-team-today-and-past-payslips", () => {
    const team = d.home.teamToday(personFor(d, "manager"));
    expect(team.length).toBeGreaterThan(0);
    const mine = d.home.payslips(personFor(d, "employee"));
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((m) => m.month < "2026-10")).toBe(true);
  });
});
