import type { ApproverSpec, Role } from "@payroll/contract";
import { fils } from "@payroll/engine";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  hasDistinctApprovers,
  mayDecide,
  resolveChain,
  type ResolveInput,
  type ResolvedStep,
} from "../src/approvals/resolve";

const O = "o", O2 = "o2", H = "h", M = "m", E = "e";
const manager: ApproverSpec = { kind: "line-manager" };
const role = (r: "owner" | "hr"): ApproverSpec => ({ kind: "role", role: r });
const tier = (approver: ApproverSpec, min: bigint) =>
  ({ approver, minTotal: fils(min) });

const MEMBERS: { userId: string; role: Role }[] = [
  { userId: O, role: "owner" }, { userId: H, role: "hr" },
  { userId: M, role: "manager" }, { userId: E, role: "employee" }];

function input(over: Partial<ResolveInput> = {}): ResolveInput {
  return { tiers: [tier(manager, 0n)], overLimitApprover: "owner",
    total: fils(10000n), overLimit: false, claimantUserId: E,
    submitterUserId: E, lineManagerUserId: M, members: MEMBERS, ...over };
}

const eligible = (s: ResolvedStep[]) => s.map((x) => x.eligible);
const refused = (i: ResolveInput) => {
  expect(() => resolveChain(i)).toThrow(
    expect.objectContaining({ code: "NO_ELIGIBLE_APPROVER" }));
};

describe("resolveChain", () => {
  it("resolve_line_manager", () => {
    const s = resolveChain(input());
    expect(s).toEqual([{ order: 1, approver: manager, eligible: [M] }]);
  });
  it("resolve_no_manager_falls_to_hr", () => {
    const s = resolveChain(input({ lineManagerUserId: null }));
    expect(s[0]!.approver).toEqual(role("hr"));
    expect(eligible(s)).toEqual([[H]]);
  });
  it("resolve_hr_claimant_falls_to_owner", () => {
    const s = resolveChain(input({ claimantUserId: H, submitterUserId: H,
      lineManagerUserId: null, members: MEMBERS.slice(0, 2) }));
    expect(s[0]!.approver).toEqual(role("owner"));
    expect(eligible(s)).toEqual([[O]]);
  });
  it("resolve_single_owner_refused", () => {
    refused(input({ claimantUserId: O, submitterUserId: O,
      lineManagerUserId: null, members: [MEMBERS[0]!] }));
  });
  it("resolve_tiers_by_total", () => {
    const tiers = [tier(manager, 0n), tier(role("hr"), 100000n),
      tier(role("owner"), 500000n)];
    expect(resolveChain(input({ tiers, total: fils(150000n) })).length)
      .toBe(2);
    expect(resolveChain(input({ tiers, total: fils(500000n) })).length)
      .toBe(3);
  });
  it("resolve_over_limit_adds_owner", () => {
    const s = resolveChain(input({ overLimit: true }));
    expect(s.map((x) => x.approver)).toEqual([manager, role("owner")]);
    const owned = resolveChain(input({ overLimit: true,
      tiers: [tier(manager, 0n), tier(role("owner"), 0n)] }));
    expect(owned.length).toBe(2);
  });
  it("resolve_submitter_excluded", () => {
    const s = resolveChain(input({ submitterUserId: H,
      lineManagerUserId: H }));
    for (const step of s) expect(step.eligible).not.toContain(H);
    expect(eligible(s)).toEqual([[O]]);
  });
  it("resolve_needs_distinct_people", () => {
    const members = [MEMBERS[0]!, MEMBERS[1]!, MEMBERS[3]!];
    refused(input({ members, total: fils(20000n),
      tiers: [tier(role("hr"), 0n), tier(role("hr"), 10000n)] }));
    const s = resolveChain(input({ members, total: fils(20000n),
      tiers: [tier(role("hr"), 0n), tier(role("owner"), 10000n)] }));
    expect(eligible(s)).toEqual([[H], [O]]);
  });
  it("a chain with no applicable tier is refused, never empty", () => {
    refused(input({ tiers: [tier(manager, 50000n)] }));
  });
});

describe("mayDecide", () => {
  const steps: ResolvedStep[] = [
    { order: 1, approver: role("owner"), eligible: [O, O2] },
    { order: 2, approver: role("owner"), eligible: [O] }];
  const ex = [E];
  it("may_decide_blocks_reuse", () => {
    expect(mayDecide(steps, 1, O, [], ex)).toBe("APPROVER_NEEDED_LATER");
    expect(mayDecide(steps, 1, O2, [], ex)).toBe("ok");
    expect(mayDecide(steps, 2, O, [O2], ex)).toBe("ok");
    expect(mayDecide(steps, 2, O2, [O2], ex)).toBe("SOD_VIOLATION");
    expect(mayDecide(steps, 2, H, [O2], ex)).toBe("NOT_AN_APPROVER");
    expect(mayDecide(steps, 1, E, [], ex)).toBe("SOD_VIOLATION");
  });
  it("hasDistinctApprovers backtracks", () => {
    expect(hasDistinctApprovers([[O, H], [O]])).toBe(true);
    expect(hasDistinctApprovers([[O], [O]])).toBe(false);
    expect(hasDistinctApprovers([])).toBe(true);
    expect(hasDistinctApprovers([[O, H], [O, H], [H, O]])).toBe(false);
  });
});

const ROLES: Role[] = ["owner", "hr", "manager", "employee"];
const specArb: fc.Arbitrary<ApproverSpec> = fc.oneof(
  fc.constant(manager), fc.constant(role("hr")), fc.constant(role("owner")),
  fc.integer({ min: 0, max: 5 }).map((n) => ({ kind: "user" as const,
    userId: `u${n}` })));

describe("resolveChain property", () => {
  it("never makes the claimant or submitter eligible; people distinct",
    () => {
      fc.assert(fc.property(
        fc.array(fc.constantFrom(...ROLES), { minLength: 1, maxLength: 6 }),
        fc.array(fc.tuple(specArb, fc.integer({ min: 0, max: 3 })),
          { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 0, max: 5 }), fc.integer({ min: 0, max: 5 }),
        fc.option(fc.integer({ min: 0, max: 5 })), fc.boolean(),
        (roles, raw, claimant, submitter, mgr, overLimit) => {
          const members = roles.map((r, i) => ({ userId: `u${i}`, role: r }));
          const tiers = raw.map(([a, k], i) => tier(a, BigInt(i * k)))
            .sort((a, b) => Number(a.minTotal - b.minTotal));
          const i = input({ members, tiers, overLimit,
            total: fils(BigInt(raw.length * 3)),
            claimantUserId: `u${claimant}`, submitterUserId: `u${submitter}`,
            lineManagerUserId: mgr === null ? null : `u${mgr}` });
          let steps: ResolvedStep[];
          try {
            steps = resolveChain(i);
          } catch (e) {
            expect((e as { code?: string }).code)
              .toBe("NO_ELIGIBLE_APPROVER");
            return;
          }
          for (const s of steps) {
            expect(s.eligible).not.toContain(`u${claimant}`);
            expect(s.eligible).not.toContain(`u${submitter}`);
            expect(s.eligible.length).toBeGreaterThan(0);
          }
          expect(hasDistinctApprovers(eligible(steps))).toBe(true);
        }), { numRuns: 300 });
    });
});
