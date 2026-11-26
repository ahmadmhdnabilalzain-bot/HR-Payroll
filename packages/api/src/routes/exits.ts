import type { AppDeps } from "../deps";
import { register, type App } from "../http/context";
import { closeExit } from "../exits/close";
import { computeSettlement, decideExit } from "../exits/exit-decide";
import {
  createExit,
  getExit,
  listExits,
  withdrawExit,
} from "../exits/exits";
import { generateDocuments } from "../exits/hooks";
import { revokeAccess } from "../exits/revoke";

export function registerExitRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "createExit", createExit);
  register(app, deps, "listExits", listExits);
  register(app, deps, "getExit", getExit);
  register(app, deps, "decideExit", decideExit);
  register(app, deps, "computeExitSettlement", computeSettlement);
  register(app, deps, "withdrawExit", withdrawExit);
  register(app, deps, "generateExitDocuments", generateDocuments);
  register(app, deps, "revokeExitAccess", revokeAccess);
  register(app, deps, "closeExit", closeExit);
}
