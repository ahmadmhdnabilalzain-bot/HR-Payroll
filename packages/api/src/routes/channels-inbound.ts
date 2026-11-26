import type { AppDeps } from "../deps";
import { register, type App } from "../http/context";
import { intakeEmail } from "../inbound/intake";
import { getItem, listItems } from "../inbound/item-view";
import {
  getInboundSettings,
  putInboundSettings,
  rotateAddress,
} from "../inbound/mailbox";
import {
  acceptItem,
  dismissItem,
  downloadAttachment,
} from "../inbound/review";

export function registerInboundRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "getInboundSettings", getInboundSettings);
  register(app, deps, "putInboundSettings", putInboundSettings);
  register(app, deps, "rotateInboundAddress", rotateAddress);
  register(app, deps, "inboundEmailHook", intakeEmail);
  register(app, deps, "listInboundItems", listItems);
  register(app, deps, "getInboundItem", getItem);
  register(app, deps, "downloadInboundAttachment", downloadAttachment);
  register(app, deps, "acceptInboundItem", acceptItem);
  register(app, deps, "dismissInboundItem", dismissItem);
}
