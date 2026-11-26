import {
  ChecklistTemplate,
  ChecklistTemplateList,
  EmploymentTerms,
  HireRequest,
  HireResult,
  TemplateParams,
  TemplatePut,
  TermsPut,
} from "./onboarding";
import { IdParams } from "./primitives";
import { ALL_ROLES, PAYROLL, ten, type RouteDef } from "./route-def";

const one = { params: IdParams };

/**
 * Plan 8 Task 5: offer to hire, templates and employment terms.
 * `hireFromOffer` answers 201 for a new hire and 200 (same body) when
 * the offer was already hired, e.g. a retry.
 */
export const ONBOARDING_ROUTES: readonly RouteDef[] = [
  ten(PAYROLL, { id: "hireFromOffer", method: "POST",
    path: "/v1/offers/{id}/hire", ...one, body: HireRequest,
    response: HireResult, status: 201 }),
  ten(PAYROLL, { id: "listChecklistTemplates", method: "GET",
    path: "/v1/checklist-templates", response: ChecklistTemplateList }),
  ten(PAYROLL, { id: "putChecklistTemplate", method: "PUT",
    path: "/v1/checklist-templates/{kind}", params: TemplateParams,
    body: TemplatePut, response: ChecklistTemplate }),
  ten(ALL_ROLES, { id: "getEmploymentTerms", method: "GET",
    path: "/v1/employees/{id}/terms", ...one, response: EmploymentTerms }),
  ten(PAYROLL, { id: "putEmploymentTerms", method: "PUT",
    path: "/v1/employees/{id}/terms", ...one, body: TermsPut,
    response: EmploymentTerms }),
];
