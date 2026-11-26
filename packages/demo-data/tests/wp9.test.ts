import { ibanChecksumOk } from "@payroll/wps";
import { describe, expect, it } from "vitest";
import {
  ACCESS_FACTS,
  ACCESS_PERMISSIONS,
  ACCESS_ROLES,
  accessApiKeys,
  accessCan,
  accessReview,
  accessUsers,
  accessUserRows,
  accessWebhooks,
  APPROVAL_RULES,
  AS_OF,
  auditEvents,
  buildDemoCompany,
  DATA_LOCATION,
  employeeById,
  expenseRoute,
  IMPORT_SAMPLE_NAME,
  importSample,
  reportDate,
  roleMatrix,
  segregationChecks,
  serializeDemo,
  whoCan,
  type DemoCompany,
} from "../src/index";

const SEEDS = [1, 2026, 7777];
const built = new Map<number, DemoCompany>(SEEDS.map((s) =>
  [s, buildDemoCompany(s)]));
const c = built.get(2026)!;
const each = (fn: (c: DemoCompany) => void) => {
  for (const s of SEEDS) fn(built.get(s)!);
};

describe("users and roles", () => {
  it("every user is an existing employee, once, with known roles", () => {
    each((x) => {
      const us = accessUsers(x);
      expect(new Set(us.map((u) => u.employeeId)).size).toBe(us.length);
      for (const u of us) {
        const e = employeeById(x, u.employeeId);
        expect(u.email).toBe(e.email);
        expect(u.id).toBe(`usr-${u.employeeId.slice(4)}`);
        for (const r of u.roleIds) {
          expect(ACCESS_ROLES.some((y) => y.id === r)).toBe(true);
        }
        expect(e.leavingDate).toBeNull();
        expect(u.createdOn <= AS_OF && u.lastSignInAt.slice(0, 10)
          <= AS_OF).toBe(true);
      }
    });
  });

  it("roles only use permissions from the list", () => {
    const ids = new Set(ACCESS_PERMISSIONS.map((p) => p.id));
    for (const r of ACCESS_ROLES) {
      for (const p of r.permissions) expect(ids.has(p)).toBe(true);
    }
  });

  it("admin roles have the second sign-in step on, as the log says", () => {
    expect(ACCESS_FACTS.mfaRequired.on).toBe("2026-02-02");
    for (const u of accessUsers(c)) {
      const admin = u.roleIds.some((r) =>
        ACCESS_ROLES.find((y) => y.id === r)!.admin);
      if (admin) expect(u.mfa).toBe(true);
    }
    expect(accessUsers(c).some((u) => !u.mfa)).toBe(true);
  });

  it("nobody can both prepare and approve a pay run", () => {
    each((x) => {
      for (const u of accessUsers(x)) {
        expect(accessCan(x, u.employeeId, "pay.prepare") &&
          accessCan(x, u.employeeId, "pay.approve")).toBe(false);
      }
      for (const chk of segregationChecks(x)) {
        expect(chk.breaches).toEqual([]);
        expect(chk.text).toMatch(/\S/);
      }
      expect(segregationChecks(x).length).toBeGreaterThan(2);
    });
  });

  it("the pay run's maker and checker hold the right permissions", () => {
    const ap = c.approvals.find((a) => a.kind === "pay-run")!;
    expect(accessCan(c, ap.makerEmployeeId, "pay.prepare")).toBe(true);
    expect(accessCan(c, ap.checkerEmployeeId, "pay.approve")).toBe(true);
    expect(accessCan(c, ap.makerEmployeeId, "pay.approve")).toBe(false);
  });

  it("every pending approver can approve that kind of request", () => {
    const need = { leave: "leave.approve", expense: "expense.approve",
      "pay-run": "pay.approve" } as const;
    each((x) => {
      for (const a of x.approvals) {
        expect(accessCan(x, a.checkerEmployeeId, need[a.kind]))
          .toBe(true);
      }
    });
  });

  it("the audit log's actors had the permission for what they did", () => {
    const need: Record<string, string> = { "payrun.approved":
      "pay.approve", "payrun.submitted": "pay.prepare",
    "wps.file-created": "pay.prepare", "wps.file-sent": "pay.export-sif",
    "leave.approved": "leave.approve", "leave.rejected": "leave.approve",
    "expense.approved": "expense.approve", "salary.approved":
      "pay.approve", "salary.revised": "pay.prepare",
    "settlement.prepared": "pay.prepare", "employee.created":
      "people.edit", "employee.resignation-recorded": "people.edit",
    "access.user-invited": "access.manage", "access.role-changed":
      "access.manage", "access.api-key-created": "connections.manage",
    "access.webhook-created": "connections.manage",
    "setup.mfa-required": "access.manage", "access.review-completed":
      "access.review" };
    each((x) => {
      for (const e of auditEvents(x)) {
        const p = need[e.action];
        if (p === undefined || e.actorId === null) continue;
        expect(accessCan(x, e.actorId, p), `${e.id} ${e.action}`)
          .toBe(true);
      }
    });
  });

  it("users signed in after their last audited action", () => {
    for (const u of accessUsers(c)) {
      const last = auditEvents(c).filter((e) => e.actorId ===
        u.employeeId).at(-1);
      if (last !== undefined) expect(u.lastSignInAt >= last.at).toBe(true);
    }
  });

  it("access changes in the log match the users and review", () => {
    const f = ACCESS_FACTS;
    const ev = auditEvents(c);
    for (const id of f.firstInvites.users) {
      const u = accessUsers(c).find((x) => x.employeeId === id)!;
      expect(u.createdOn).toBe(f.firstInvites.on);
      expect(ev.some((e) => e.action === "access.user-invited" &&
        e.subject.id === u.id && e.at.startsWith(f.firstInvites.on)))
        .toBe(true);
    }
    // Every user created inside the log's window has an entry.
    const start = ev[0]!.at.slice(0, 10);
    for (const u of accessUsers(c).filter((x) => x.createdOn >= start)) {
      expect(ev.some((e) => e.action === "access.user-invited" &&
        e.subject.id === u.id)).toBe(true);
    }
    const r = accessReview(c);
    expect(r.checked).toBe(accessUsers(c).length);
    expect(r.checked).toBe(f.review.checked);
    const grace = accessUsers(c).find((u) => u.employeeId ===
      f.graceRole.employeeId)!;
    expect(grace.roleIds).toEqual(["hr-officer"]);
    const juma = accessUsers(c).find((u) => u.employeeId ===
      f.jumaRole.employeeId)!;
    expect(juma.roleIds).toEqual(["finance-read-only"]);
    expect(r.text).toContain(reportDate(f.review.on));
  });

  it("the matrix and who-can answer from the same roles", () => {
    const m = roleMatrix(c);
    expect(m.rows).toHaveLength(ACCESS_PERMISSIONS.length);
    for (const row of m.rows) {
      for (const role of ACCESS_ROLES) {
        expect(row.cells[role.id]).toBe(role.permissions
          .includes(row.permissionId));
      }
    }
    const approvers = whoCan(c, "pay.approve");
    expect(approvers.map((p) => p.employeeId)).toEqual(["emp-001"]);
    expect(whoCan(c, "pay.prepare").map((p) => p.employeeId))
      .toEqual(["emp-028"]);
    const employee = m.roles.find((r) => r.id === "employee")!;
    expect(employee.userCount).toBe(c.employees.filter((e) =>
      e.leavingDate === null).length);
  });

  it("rows are display text", () => {
    for (const r of accessUserRows(c)) {
      expect(r.lastSignInText).toMatch(
        /^\d{1,2} [A-Z][a-z]{2} 2026, \d{2}:\d{2}$/);
      expect(["On", "Not set up"]).toContain(r.mfaText);
      expect(r.createdText).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/);
    }
    expect(accessUserRows(c)[0]!.name.length).toBeGreaterThan(3);
  });

  it("approval rules agree with how the demo's requests were decided", () => {
    expect(APPROVAL_RULES.length).toBeGreaterThan(3);
    for (const x of c.expenses) {
      const r = expenseRoute(x.amount);
      const decider = x.status === "approved"
        ? auditEvents(c).find((e) => e.action === "expense.approved" &&
          e.subject.id === x.id)!.actorId!
        : c.approvals.find((a) => a.subjectId === x.id)!
          .checkerEmployeeId;
      const roles = accessUsers(c).find((u) => u.employeeId === decider)!
        .roleIds;
      expect(roles).toContain(r.roleId);
    }
  });
});

describe("API keys and webhooks", () => {
  it("keys are masked, read-only and in the log", () => {
    const keys = accessApiKeys(c);
    expect(keys.length).toBeGreaterThanOrEqual(2);
    for (const k of keys) {
      expect(k.masked).toMatch(/^zbk_demo_\*{12,}[0-9a-f]{4}$/);
      expect(JSON.stringify(k)).not.toMatch(/zbk_demo_[0-9a-f]{8,}/);
      for (const s of k.scopes) {
        expect(s).toMatch(/\.view$/);
        expect(ACCESS_PERMISSIONS.some((p) => p.id === s)).toBe(true);
      }
      expect(k.lastUsedAt === null || k.lastUsedAt.slice(0, 10) <= AS_OF)
        .toBe(true);
      expect(accessCan(c, k.createdById, "connections.manage")).toBe(true);
      const ev = auditEvents(c).find((e) => e.action ===
        "access.api-key-created" && e.subject.id === k.id)!;
      expect(ev.at.slice(0, 10)).toBe(k.createdOn);
      expect(ev.actorId).toBe(k.createdById);
    }
    expect(keys[0]!.createdOn).toBe(ACCESS_FACTS.apiKeys[0]!.on);
  });

  it("webhooks are in the log and deliveries are real audit events", () => {
    const hooks = accessWebhooks(c);
    expect(hooks.length).toBeGreaterThanOrEqual(2);
    const ev = auditEvents(c);
    for (const h of hooks) {
      expect(h.url).toMatch(/^https:\/\/[a-z.-]+\.test\//);
      expect(h.secretMasked).toMatch(/^\*{8,}[0-9a-f]{4}$/);
      const made = ev.find((e) => e.action === "access.webhook-created" &&
        e.subject.id === h.id)!;
      expect(made.at.slice(0, 10)).toBe(h.createdOn);
      for (const d of h.deliveries) {
        const src = ev.find((e) => e.id === d.eventId)!;
        expect(h.events).toContain(src.action);
        expect(d.at >= made.at).toBe(true);
        expect(d.at).toBe(src.at);
      }
    }
  });

  it("each hook gets every event after it was made, and no earlier", () => {
    const ev = auditEvents(c);
    for (const h of accessWebhooks(c)) {
      const made = `${h.createdOn}T00:00`;
      const want = ev.filter((e) => h.events.includes(e.action) &&
        e.at >= made).map((e) => e.id);
      expect(h.deliveries.map((d) => d.eventId)).toEqual(want);
    }
  });

  it("one hook is failing, with a plain reason", () => {
    const failing = accessWebhooks(c).filter((h) =>
      h.status === "failing");
    expect(failing).toHaveLength(1);
    expect(failing[0]!.deliveries.at(-1)!.outcome).toBe("failed");
    expect(failing[0]!.statusText).toMatch(/\S/);
  });
});

describe("import sample", () => {
  const s = importSample(c);

  it("is a file of text whose rows are checked from the text", () => {
    expect(s.fileName).toBe(IMPORT_SAMPLE_NAME);
    const lines = s.text.trim().split("\n");
    expect(lines).toHaveLength(s.rows.length + 1);
    expect(s.rows.map((r) => r.line)).toEqual(s.rows.map((_, i) => i + 2));
    expect(s.summary.rows).toBe(s.rows.length);
    expect(s.summary.ready + s.summary.warnings + s.summary.errors)
      .toBe(s.rows.length);
    expect(s.summary.ready).toBeGreaterThanOrEqual(3);
    expect(s.summary.errors).toBeGreaterThanOrEqual(3);
    expect(s.summaryText).toMatch(/rows/);
  });

  it("rows are existing people with the roster's own values", () => {
    each((x) => {
      for (const r of importSample(x).rows) {
        const e = employeeById(x, r.employeeId!);
        expect(r.values.name).toBe(e.fullName);
        expect(r.values.number).toMatch(/^ZB-\d{4}$/);
      }
    });
  });

  it("the IBAN problems are the ones already in the data", () => {
    const bad = c.employees.find((e) => e.cases.includes("iban-typo"))!;
    const none = c.employees.find((e) => e.cases.includes("missing-iban"))!;
    const row = (id: string) => s.rows.find((r) => r.employeeId === id)!;
    expect(ibanChecksumOk(bad.iban!.value)).toBe(false);
    expect(row(bad.id).problems.some((p) => p.column === "iban" &&
      p.severity === "error")).toBe(true);
    expect(row(none.id).problems.some((p) => p.column === "iban" &&
      p.severity === "warning")).toBe(true);
    const ok = s.rows.filter((r) => r.problems.length === 0);
    for (const r of ok) {
      const e = employeeById(c, r.employeeId!);
      expect(ibanChecksumOk(e.iban!.value)).toBe(true);
    }
  });

  it("problems are plain sentences with a fix and no raw ISO dates", () => {
    for (const r of s.rows) {
      expect(r.status).toBe(r.problems.some((p) =>
        p.severity === "error") ? "error" : r.problems.length > 0
        ? "warning" : "ready");
      for (const p of r.problems) {
        expect(p.message).not.toMatch(/\d{4}-\d{2}-\d{2}/);
        expect(p.message.length).toBeGreaterThan(20);
        expect(p.fix.length).toBeGreaterThan(10);
      }
    }
  });

  it("flags a salary and a leaving date that disagree with the pay run", () => {
    const bp = c.payRun.backPay[0]!;
    const r = s.rows.find((x) => x.employeeId === bp.employeeId)!;
    expect(r.problems.some((p) => p.column === "basic" &&
      p.message.includes("1,000.00"))).toBe(true);
    const leaver = c.employees.find((e) => e.cases.includes("leaver"))!;
    const l = s.rows.find((x) => x.employeeId === leaver.id)!;
    expect(l.problems.some((p) => p.column === "leaving" &&
      p.message.includes(reportDate(leaver.leavingDate!)))).toBe(true);
  });

  it("a repeated employee number is reported on both rows", () => {
    const dup = s.rows.filter((r) => r.problems.some((p) =>
      p.column === "number"));
    expect(dup).toHaveLength(2);
    expect(dup[0]!.values.number).toBe(dup[1]!.values.number);
  });

  it("the file holds only fake values", () => {
    expect(s.text).not.toMatch(/\bAE\d{2}(?!999)\d{19}\b/);
    expect(s.text).not.toMatch(/784\d{12}/);
    for (const r of s.rows) expect(r.values.email).toMatch(/\S/);
  });
});

describe("data location", () => {
  it("says demo only and Frankfurt, and claims no certification", () => {
    expect(DATA_LOCATION.region).toBe("Frankfurt, Germany");
    expect(DATA_LOCATION.demoOnly).toBe(true);
    const all = DATA_LOCATION.statements.map((x) => x.text).join(" ");
    expect(all).toMatch(/demo/i);
    expect(all).toMatch(/Frankfurt/);
    expect(all).not.toMatch(/(ISO|SOC|PCI)[ -]?\d/);
    expect(all).not.toMatch(/\b(compliant|certified|accredited)\b/i);
    expect(DATA_LOCATION.notClaimed).toContain("certification");
    expect(DATA_LOCATION.certifications).toEqual([]);
  });
});

describe("determinism", () => {
  it("same seed, same bytes", () => {
    const pack = (x: DemoCompany) => serializeDemo({ u: accessUsers(x),
      k: accessApiKeys(x), h: accessWebhooks(x), i: importSample(x) });
    expect(pack(buildDemoCompany(2026))).toBe(pack(buildDemoCompany(2026)));
  });
});
