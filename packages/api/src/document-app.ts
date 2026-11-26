import type { AppDeps } from "./deps";
import type { App } from "./http/context";
import {
  registerDocumentSettingsRoutes,
  registerEmployeeDocumentRoutes,
} from "./routes/employee-documents";
import { registerFileRoutes } from "./routes/files";
import { registerLetterTemplateRoutes } from "./routes/letter-templates";
import { registerLibraryRoutes } from "./routes/library";

/** Plan 7 routes: files, documents, library, letters, Emiratisation. */
export function registerDocumentApp(app: App, deps: AppDeps): void {
  registerFileRoutes(app, deps);
  registerEmployeeDocumentRoutes(app, deps);
  registerDocumentSettingsRoutes(app, deps);
  registerLibraryRoutes(app, deps);
  registerLetterTemplateRoutes(app, deps);
}
