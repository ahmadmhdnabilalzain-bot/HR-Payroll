import { describe, expect, it } from "vitest";
import {
  CHANNEL_DEFAULTS,
  CHANNEL_DEFAULTS_NOTE,
  CHANNEL_ROUTES,
  ChannelSettingsBody,
  ROUTE_GROUPS,
  ROUTES,
} from "../src/index";

/** Every Plan 13 route id, in task order (each task appends). */
const CHANNEL_ROUTE_IDS = [
  "getChannelSettings", "putChannelSettings",
  "listNotifications", "markNotificationsRead", "getNotificationPrefs",
  "putNotificationPrefs", "listNotificationDeliveries",
  "listNotificationTemplates",
  "getMyChannels", "startWhatsAppOptIn", "verifyWhatsAppOptIn",
  "withdrawWhatsAppOptIn", "whatsAppHookVerify", "whatsAppHook",
  "getInboundSettings", "putInboundSettings", "rotateInboundAddress",
  "inboundEmailHook", "listInboundItems", "getInboundItem",
  "downloadInboundAttachment", "acceptInboundItem", "dismissInboundItem",
  "listCalendarFeeds", "createCalendarFeed", "revokeCalendarFeed",
  "getCalendarFeed", "ssoStart", "ssoCallback", "ssoLinkStart",
  "listSsoIdentities", "unlinkSsoIdentity", "getSsoSettings",
  "putSsoSettings", "listWebhookEndpoints", "createWebhookEndpoint",
  "updateWebhookEndpoint", "rotateWebhookSecret", "testWebhookEndpoint",
  "listWebhookDeliveries", "redeliverWebhook",
];

describe("CHANNEL_ROUTES", () => {
  it("holds exactly the channel ids in task order", () => {
    expect(CHANNEL_ROUTES.map((r) => r.id)).toEqual(CHANNEL_ROUTE_IDS);
  });
  it("is the last route group and every entry is in ROUTES", () => {
    expect(ROUTE_GROUPS.at(-1)).toBe(CHANNEL_ROUTES);
    for (const r of CHANNEL_ROUTES) expect(ROUTES).toContain(r);
    expect(ROUTES.slice(-CHANNEL_ROUTES.length)).toEqual(
      [...CHANNEL_ROUTES]);
  });
  it("no (method, path) pair repeats and no route is DELETE", () => {
    const keys = ROUTES.map((r) => `${r.method} ${r.path}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(ROUTES.filter((r) => (r.method as string) === "DELETE"))
      .toEqual([]);
  });
});

describe("channel settings", () => {
  it("defaults parse and are labelled product defaults", () => {
    expect(ChannelSettingsBody.safeParse(CHANNEL_DEFAULTS).success)
      .toBe(true);
    expect(ChannelSettingsBody.safeParse({ ...CHANNEL_DEFAULTS,
      whatsappDailyCap: -1 }).success).toBe(false);
    expect(CHANNEL_DEFAULTS_NOTE).toContain("not provider limits");
  });
  it("putting settings is owner-only with MFA", () => {
    const put = CHANNEL_ROUTES.find((r) => r.id === "putChannelSettings");
    expect(put?.roles).toEqual(["owner"]);
    expect(put?.mfa).toBe(true);
  });
});
