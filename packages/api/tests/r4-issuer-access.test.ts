import { describe, expect, it } from "vitest";
import { letterWorld } from "./helpers/letter-world";
import { call } from "./helpers/test-app";

const WARN = { inputs: { "input.incidentDate": "2026-11-20",
  "input.reason": "Late twice", "input.replyTo": "hr@example.com" } };

/**
 * Review I-4: an issuer reads a salary-free letter only while still
 * owner or hr, or still the manager of the letter's employee.
 */
describe("issuer access follows the current role and reporting line",
  () => {
    it("a demoted manager loses the warning letter", async () => {
      const w = await letterWorld("r4a");
      const { s } = w;
      const l = await w.issue(s.manager, "warning", { ...WARN,
        employeeId: s.emp.report });
      expect(l.status, l.text).toBe(201);
      const path = `/v1/letters/${l.body.id}`;
      expect((await w.req(s.manager, "GET", path)).status).toBe(200);
      const ch = await call(w.ctx.app, s.owner.token, s.companyId,
        "PATCH", `/v1/users/${s.manager.userId}`, { role: "employee" });
      expect(ch.status, ch.text).toBe(200);
      expect((await w.req(s.manager, "GET", path)).status).toBe(404);
      expect((await w.download(s.manager, l.body.id)).status).toBe(404);
    });
    it("a manager loses it when the report moves away", async () => {
      const w = await letterWorld("r4b");
      const { s } = w;
      const l = await w.issue(s.manager, "warning", { ...WARN,
        employeeId: s.emp.report2 });
      expect(l.status, l.text).toBe(201);
      await w.req(s.hr, "PATCH", `/v1/employees/${s.emp.report2}`,
        { managerId: null });
      expect((await w.req(s.manager, "GET",
        `/v1/letters/${l.body.id}`)).status).toBe(404);
      const list = await w.req(s.manager, "GET", "/v1/letters");
      expect(list.body.items.map((x: { id: string }) => x.id))
        .not.toContain(l.body.id);
    });
  });
