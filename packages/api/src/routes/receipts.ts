import type { AppDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";
import {
  downloadReceipt,
  getReceipt,
  uploadReceipt,
  type ReceiptViewerCheck,
} from "../receipts/receipts";

type IdCtx = ReqCtx<unknown, unknown, { id: string }>;

export function registerReceiptRoutes(app: App, deps: AppDeps,
  extra?: ReceiptViewerCheck): void {
  register(app, deps, "uploadReceipt", uploadReceipt);
  register(app, deps, "getReceipt", (ctx: IdCtx) =>
    getReceipt(ctx, ctx.params.id, extra));
  register(app, deps, "downloadReceipt", (ctx: IdCtx) =>
    downloadReceipt(ctx, ctx.params.id, extra));
}
