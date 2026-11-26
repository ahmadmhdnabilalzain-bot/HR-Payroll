import type { AppDeps } from "../deps";
import {
  addVersion,
  createDocument,
  downloadDocument,
  getDocument,
  listDocuments,
  verifyDocument,
} from "../documents/employee-docs";
import {
  documentAlerts,
  retentionReport,
  type ExtraCandidates,
} from "../documents/reports";
import { loadSettings, putSettings } from "../documents/settings";
import { register, type App, type ReqCtx } from "../http/context";

export function registerEmployeeDocumentRoutes(app: App,
  deps: AppDeps): void {
  register(app, deps, "employeeDocumentsList", listDocuments);
  register(app, deps, "employeeDocumentCreate", createDocument);
  register(app, deps, "employeeDocumentGet", getDocument);
  register(app, deps, "employeeDocumentVersionAdd", addVersion);
  register(app, deps, "employeeDocumentVerify", verifyDocument);
  register(app, deps, "employeeDocumentDownload", downloadDocument);
  register(app, deps, "documentAlerts", documentAlerts);
}

/** Settings and the retention due list (letters join through `extra`). */
export function registerDocumentSettingsRoutes(app: App, deps: AppDeps,
  extra?: ExtraCandidates): void {
  register(app, deps, "documentSettingsGet", (ctx: ReqCtx) =>
    loadSettings(ctx.tx, ctx.tenant!.companyId));
  register(app, deps, "documentSettingsPut", putSettings);
  register(app, deps, "documentRetentionDue", (ctx: ReqCtx) =>
    retentionReport(ctx, extra));
}
