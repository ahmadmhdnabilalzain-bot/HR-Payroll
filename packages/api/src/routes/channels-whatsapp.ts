import type { AppDeps } from "../deps";
import { register, type App } from "../http/context";
import { myChannels } from "../whatsapp/my-channels";
import {
  startOptIn,
  verifyOptIn,
  withdrawOptIn,
} from "../whatsapp/opt-in";

export function registerWhatsAppOptInRoutes(app: App, deps: AppDeps)
  : void {
  register(app, deps, "getMyChannels", myChannels);
  register(app, deps, "startWhatsAppOptIn", startOptIn);
  register(app, deps, "verifyWhatsAppOptIn", verifyOptIn);
  register(app, deps, "withdrawWhatsAppOptIn", withdrawOptIn);
}
