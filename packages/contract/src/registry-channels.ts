import type { z } from "zod";
import * as settings from "./channel-settings";
import * as notifications from "./notifications";
import * as templates from "./templates";
import * as whatsapp from "./whatsapp";
import * as waActions from "./whatsapp-actions";
import * as inbound from "./inbound";
import * as calendar from "./calendar";
import * as sso from "./sso";
import * as webhooks from "./webhooks";
import * as apiKeys from "./api-keys";

/** Plan 13's named schemas (OpenAPI components and EXAMPLES keys). */
const NAMES: [Record<string, unknown>, string[]][] = [
  [settings, ["ProviderStatus", "ChannelSettingsBody", "ChannelSettings",
    "ChannelSettingsUpdate"]],
  [notifications, ["QuietHours", "NotificationPrefs",
    "NotificationPrefsView", "Notification", "NotificationPage",
    "MarkRead", "MarkReadResult", "DeliveryRow", "DeliveryRowList"]],
  [templates, ["TemplateInfo", "TemplateInfoList"]],
  [whatsapp, ["WhatsAppOptInStart", "WhatsAppVerify", "MyChannels"]],
  [waActions, ["HookChallenge", "HookAck"]],
  [inbound, ["InboundSettingsBody", "InboundSettings",
    "InboundSettingsUpdate", "SenderAuth", "InboundItem", "InboundItemList",
    "InboundAccept", "InboundDismiss", "InboundAttachmentContent"]],
  [calendar, ["CalendarFeed", "CalendarFeedList", "CalendarFeedCreated",
    "CalendarFeedCreate", "IcsText"]],
  [sso, ["SsoStartRequest", "SsoStartResponse", "SsoCallbackRequest",
    "SsoIdentity", "SsoIdentityList", "SsoSettingsBody", "SsoSettings",
    "SsoSettingsUpdate"]],
  [webhooks, ["WebhookEvent", "WebhookEndpointCreate", "WebhookEndpoint",
    "WebhookEndpointList", "WebhookEndpointCreated",
    "WebhookEndpointUpdate", "WebhookSecretRotate", "WebhookDelivery",
    "WebhookDeliveryList"]],
  [apiKeys, ["ApiKeyCreate", "ApiKey", "ApiKeyList", "ApiKeyCreated",
    "ApiKeyUpdate", "ApiKeyRotate"]],
];

export const CHANNEL_SCHEMAS: Readonly<Record<string, z.ZodType>> =
  Object.fromEntries(NAMES.flatMap(([mod, names]) => names.map((n) => {
    const s = mod[n];
    if (s === undefined) throw new Error(`no schema ${n}`);
    return [n, s as z.ZodType];
  })));
