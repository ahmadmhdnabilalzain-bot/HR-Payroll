import type {
  ApprovalChainUpdate,
  ApprovalDecision,
  SubjectType,
} from "@payroll/contract";
import { listChains, putChain } from "../approvals/chains";
import { decide, type Action } from "../approvals/decide";
import { inbox } from "../approvals/requests";
import type { SubjectHandlers } from "../approvals/subjects";
import type { AppDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";

type DecideCtx = ReqCtx<ApprovalDecision, unknown, { id: string }>;
const ACTIONS: [string, Action][] = [["approveStep", "approve"],
  ["rejectStep", "reject"], ["returnStep", "return"]];

export function registerApprovalRoutes(app: App, deps: AppDeps,
  handlers: SubjectHandlers): void {
  register(app, deps, "approvalInbox", async (ctx) =>
    ({ items: await inbox(ctx, handlers) }));
  for (const [id, action] of ACTIONS) {
    register(app, deps, id, (ctx: DecideCtx) =>
      decide(ctx, handlers, ctx.params.id, action));
  }
  register(app, deps, "listApprovalChains", async (ctx) =>
    ({ items: await listChains(ctx.tx, ctx.tenant!.companyId) }));
  register(app, deps, "putApprovalChain", (ctx: ReqCtx<ApprovalChainUpdate,
    unknown, { subjectType: SubjectType }>) =>
    putChain(ctx, ctx.params.subjectType, ctx.body));
}
