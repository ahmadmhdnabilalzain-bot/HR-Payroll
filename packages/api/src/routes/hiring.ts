import type { AppDeps } from "../deps";
import { register, type App, type ReqCtx } from "../http/context";
import {
  createApplication,
  getApplication,
  listApplications,
  moveStage,
} from "../hiring/applications";
import { createCandidate, listCandidates } from "../hiring/candidates";
import { cancelInterview, scheduleInterview } from "../hiring/interviews";
import {
  closeRequisition,
  createRequisition,
  decideRequisition,
  listRequisitions,
  toRequisition,
  visibleRequisition,
} from "../hiring/requisitions";
import { submitScorecard } from "../hiring/scorecards";

type IdCtx = ReqCtx<unknown, unknown, { id: string }>;

export function registerHiringRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "listRequisitions", listRequisitions);
  register(app, deps, "createRequisition", createRequisition);
  register(app, deps, "getRequisition", async (ctx: IdCtx) =>
    toRequisition(await visibleRequisition(ctx)));
  register(app, deps, "decideRequisition", decideRequisition);
  register(app, deps, "closeRequisition", closeRequisition);
  register(app, deps, "listCandidates", listCandidates);
  register(app, deps, "createCandidate", createCandidate);
  register(app, deps, "listApplications", listApplications);
  register(app, deps, "createApplication", createApplication);
  register(app, deps, "getApplication", getApplication);
  register(app, deps, "moveApplicationStage", moveStage);
  register(app, deps, "submitScorecard", submitScorecard);
  register(app, deps, "scheduleInterview", scheduleInterview);
  register(app, deps, "cancelInterview", cancelInterview);
}
