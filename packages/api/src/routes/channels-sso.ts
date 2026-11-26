import type { AppDeps } from "../deps";
import { register, type App } from "../http/context";
import { ssoCallback, ssoLinkStart, ssoStart } from "../sso/service";
import {
  getSsoSettings,
  listIdentities,
  putSsoSettings,
  unlinkIdentity,
} from "../sso/settings";

export function registerSsoRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "ssoStart", ssoStart);
  register(app, deps, "ssoCallback", ssoCallback);
  register(app, deps, "ssoLinkStart", ssoLinkStart);
  register(app, deps, "listSsoIdentities", listIdentities);
  register(app, deps, "unlinkSsoIdentity", unlinkIdentity);
  register(app, deps, "getSsoSettings", getSsoSettings);
  register(app, deps, "putSsoSettings", putSsoSettings);
}
