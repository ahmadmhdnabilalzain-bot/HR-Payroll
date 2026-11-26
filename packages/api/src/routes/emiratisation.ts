import type { AppDeps } from "../deps";
import {
  emiratisationReport,
  putEmiratisationSettings,
  putEmployeeFlags,
} from "../emiratisation/report";
import { register, type App } from "../http/context";

export function registerEmiratisationRoutes(app: App, deps: AppDeps)
  : void {
  register(app, deps, "emiratisationReport", emiratisationReport);
  register(app, deps, "emiratisationSettingsPut", putEmiratisationSettings);
  register(app, deps, "employeeEmiratisationPut", putEmployeeFlags);
}
