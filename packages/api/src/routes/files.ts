import type { AppDeps } from "../deps";
import { uploadFile } from "../files/files";
import { register, type App } from "../http/context";

export function registerFileRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "fileUpload", uploadFile);
}
