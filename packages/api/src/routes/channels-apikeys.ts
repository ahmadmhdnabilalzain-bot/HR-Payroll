import {
  createKey,
  listKeys,
  revokeKey,
  rotateKey,
  updateKey,
} from "../apikeys/keys";
import type { AppDeps } from "../deps";
import { register, type App } from "../http/context";

export function registerApiKeyRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "listApiKeys", listKeys);
  register(app, deps, "createApiKey", createKey);
  register(app, deps, "updateApiKey", updateKey);
  register(app, deps, "rotateApiKey", rotateKey);
  register(app, deps, "revokeApiKey", revokeKey);
}
