import type { z } from "zod";
import * as settings from "./channel-settings";
import * as notifications from "./notifications";
import * as templates from "./templates";
import * as whatsapp from "./whatsapp";

/** Plan 13's named schemas (OpenAPI components and EXAMPLES keys). */
const NAMES: [Record<string, unknown>, string[]][] = [
  [settings, ["ProviderStatus", "ChannelSettingsBody", "ChannelSettings",
    "ChannelSettingsUpdate"]],
  [notifications, ["QuietHours", "NotificationPrefs",
    "NotificationPrefsView", "Notification", "NotificationPage",
    "MarkRead", "MarkReadResult", "DeliveryRow", "DeliveryRowList"]],
  [templates, ["TemplateInfo", "TemplateInfoList"]],
  [whatsapp, ["WhatsAppOptInStart", "WhatsAppVerify", "MyChannels"]],
];

export const CHANNEL_SCHEMAS: Readonly<Record<string, z.ZodType>> =
  Object.fromEntries(NAMES.flatMap(([mod, names]) => names.map((n) => {
    const s = mod[n];
    if (s === undefined) throw new Error(`no schema ${n}`);
    return [n, s as z.ZodType];
  })));
