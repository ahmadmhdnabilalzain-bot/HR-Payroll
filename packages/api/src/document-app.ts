import type { AppDeps } from "./deps";
import type { App } from "./http/context";
import {
  registerDocumentSettingsRoutes,
  registerEmployeeDocumentRoutes,
} from "./routes/employee-documents";
import { registerFileRoutes } from "./routes/files";
import { registerLetterTemplateRoutes } from "./routes/letter-templates";
import { letterRetention } from "./letters/letters";
import { registerEmiratisationRoutes } from "./routes/emiratisation";
import { registerLetterRoutes } from "./routes/letters";
import { registerLibraryRoutes } from "./routes/library";

/** Plan 7 routes: files, documents, library, letters, Emiratisation. */
export function registerDocumentApp(app: App, deps: AppDeps): void {
  registerFileRoutes(app, deps);
  registerEmployeeDocumentRoutes(app, deps);
  registerDocumentSettingsRoutes(app, deps, letterRetention);
  registerLibraryRoutes(app, deps);
  registerLetterTemplateRoutes(app, deps);
  registerLetterRoutes(app, deps);
  registerEmiratisationRoutes(app, deps);
}
