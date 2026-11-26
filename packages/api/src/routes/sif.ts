import type { AppDeps } from "../deps";
import { register, type App } from "../http/context";
import {
  downloadSifFile,
  generateSifFile,
  getSifFile,
} from "../payroll/sif-files";

export function registerSifRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "generateSif", generateSifFile);
  register(app, deps, "getSifFile", getSifFile);
  register(app, deps, "downloadSifFile", downloadSifFile);
}
