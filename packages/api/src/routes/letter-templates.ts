import { MERGE_FIELDS } from "@payroll/contract";
import type { AppDeps } from "../deps";
import { register, type App } from "../http/context";
import {
  addTemplateVersion,
  createTemplate,
  getTemplate,
  listTemplates,
  nativeReview,
  publishVersion,
} from "../letters/templates";

export function registerLetterTemplateRoutes(app: App, deps: AppDeps)
  : void {
  register(app, deps, "letterFields", async () =>
    ({ items: [...MERGE_FIELDS] }));
  register(app, deps, "letterTemplatesList", listTemplates);
  register(app, deps, "letterTemplateCreate", createTemplate);
  register(app, deps, "letterTemplateGet", getTemplate);
  register(app, deps, "letterTemplateVersionAdd", addTemplateVersion);
  register(app, deps, "letterTemplatePublish", publishVersion);
  register(app, deps, "letterTemplateNativeReview", nativeReview);
}
