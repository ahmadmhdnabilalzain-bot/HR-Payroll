import type { AppDeps } from "../deps";
import { register, type App } from "../http/context";
import { hireFromOffer } from "../onboarding/hire";
import { listTemplates, putTemplate } from "../onboarding/templates";
import { getTerms, putTerms } from "../onboarding/terms";

export function registerOnboardingRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "hireFromOffer", hireFromOffer);
  register(app, deps, "listChecklistTemplates", listTemplates);
  register(app, deps, "putChecklistTemplate", putTemplate);
  register(app, deps, "getEmploymentTerms", getTerms);
  register(app, deps, "putEmploymentTerms", putTerms);
}
