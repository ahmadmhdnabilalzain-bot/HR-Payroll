import { ChannelSettings, ChannelSettingsUpdate } from "./channel-settings";
import {
  DeliveryQuery,
  DeliveryRowList,
  MarkRead,
  MarkReadResult,
  NotificationPage,
  NotificationPrefs,
  NotificationPrefsView,
  NotificationQuery,
} from "./notifications";
import {
  ALL_ROLES,
  OWNER,
  PAYROLL,
  ten,
  type RouteDef,
} from "./route-def";
import { TemplateInfoList } from "./templates";
import {
  MyChannels,
  WhatsAppOptInStart,
  WhatsAppVerify,
} from "./whatsapp";

/** Task 1: company channel settings. */
const SETTINGS: readonly RouteDef[] = [
  ten(PAYROLL, { id: "getChannelSettings", method: "GET",
    path: "/v1/channel-settings", response: ChannelSettings }),
  ten(OWNER, { id: "putChannelSettings", method: "PUT",
    path: "/v1/channel-settings", body: ChannelSettingsUpdate,
    response: ChannelSettings, mfa: true }),
];

/** Task 2: notifications, preferences, delivery log, templates. */
const NOTIFY: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "listNotifications", method: "GET",
    path: "/v1/me/notifications", query: NotificationQuery,
    response: NotificationPage }),
  ten(ALL_ROLES, { id: "markNotificationsRead", method: "POST",
    path: "/v1/me/notifications/read", body: MarkRead,
    response: MarkReadResult }),
  ten(ALL_ROLES, { id: "getNotificationPrefs", method: "GET",
    path: "/v1/me/notification-prefs", response: NotificationPrefsView }),
  ten(ALL_ROLES, { id: "putNotificationPrefs", method: "PUT",
    path: "/v1/me/notification-prefs", body: NotificationPrefs,
    response: NotificationPrefsView }),
  ten(PAYROLL, { id: "listNotificationDeliveries", method: "GET",
    path: "/v1/notification-deliveries", query: DeliveryQuery,
    response: DeliveryRowList }),
  ten(PAYROLL, { id: "listNotificationTemplates", method: "GET",
    path: "/v1/notification-templates", response: TemplateInfoList }),
];

/** Task 3: the caller's channels and WhatsApp opt-in. */
const OPT_IN: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "getMyChannels", method: "GET",
    path: "/v1/me/channels", response: MyChannels }),
  ten(ALL_ROLES, { id: "startWhatsAppOptIn", method: "POST",
    path: "/v1/me/channels/whatsapp/opt-in", body: WhatsAppOptInStart,
    response: MyChannels }),
  ten(ALL_ROLES, { id: "verifyWhatsAppOptIn", method: "POST",
    path: "/v1/me/channels/whatsapp/verify", body: WhatsAppVerify,
    response: MyChannels }),
  ten(ALL_ROLES, { id: "withdrawWhatsAppOptIn", method: "POST",
    path: "/v1/me/channels/whatsapp/withdraw", response: MyChannels }),
];

/** Plan 13: channels and integrations (the last route group). */
export const CHANNEL_ROUTES: readonly RouteDef[] = [
  ...SETTINGS,
  ...NOTIFY,
  ...OPT_IN,
];
