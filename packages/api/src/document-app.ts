import type { AppDeps } from "./deps";
import type { App } from "./http/context";
import { registerFileRoutes } from "./routes/files";

/** Plan 7 routes: files, documents, library, letters, Emiratisation. */
export function registerDocumentApp(app: App, deps: AppDeps): void {
  registerFileRoutes(app, deps);
}
