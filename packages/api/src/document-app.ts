import type { AppDeps } from "./deps";
import type { App } from "./http/context";
import {
  registerDocumentSettingsRoutes,
  registerEmployeeDocumentRoutes,
} from "./routes/employee-documents";
import { registerFileRoutes } from "./routes/files";

/** Plan 7 routes: files, documents, library, letters, Emiratisation. */
export function registerDocumentApp(app: App, deps: AppDeps): void {
  registerFileRoutes(app, deps);
  registerEmployeeDocumentRoutes(app, deps);
  registerDocumentSettingsRoutes(app, deps);
}
