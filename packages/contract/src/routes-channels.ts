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
  pub,
  ten,
  usr,
  type RouteDef,
} from "./route-def";
import {
  SsoCallbackRequest,
  SsoIdentityList,
  SsoProviderParams,
  SsoSettings,
  SsoSettingsUpdate,
  SsoStartRequest,
  SsoStartResponse,
} from "./sso";
import { LoginResponse } from "./user";
import {
  WebhookDelivery,
  WebhookDeliveryList,
  WebhookDeliveryQuery,
  WebhookEndpoint,
  WebhookEndpointCreate,
  WebhookEndpointCreated,
  WebhookEndpointList,
  WebhookEndpointUpdate,
  WebhookSecretRotate,
} from "./webhooks";
import { HookAck, HookChallenge, WhatsAppHookQuery } from
  "./whatsapp-actions";
import {
  InboundAccept,
  InboundAttachmentContent,
  InboundAttachmentParams,
  InboundDismiss,
  InboundHookParams,
  InboundItem,
  InboundItemList,
  InboundQuery,
  InboundSettings,
  InboundSettingsUpdate,
} from "./inbound";
import { IdParams } from "./primitives";
import {
  CalendarFeed,
  CalendarFeedCreate,
  CalendarFeedCreated,
  CalendarFeedList,
  CalendarTokenParams,
  IcsText,
} from "./calendar";
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

/** Task 4: the WhatsApp webhook (public; signed by the provider). */
const WA_HOOK: readonly RouteDef[] = [
  pub({ id: "whatsAppHookVerify", method: "GET",
    path: "/v1/hooks/whatsapp", query: WhatsAppHookQuery,
    response: HookChallenge, contentType: "text/plain" }),
  pub({ id: "whatsAppHook", method: "POST", path: "/v1/hooks/whatsapp",
    response: HookAck, rawBody: true }),
];

const one = { params: IdParams };

/** Task 5: email-in settings, the provider hook and the review inbox. */
const INBOUND: readonly RouteDef[] = [
  ten(PAYROLL, { id: "getInboundSettings", method: "GET",
    path: "/v1/inbound/settings", response: InboundSettings }),
  ten(OWNER, { id: "putInboundSettings", method: "PUT",
    path: "/v1/inbound/settings", body: InboundSettingsUpdate,
    response: InboundSettings, mfa: true }),
  ten(OWNER, { id: "rotateInboundAddress", method: "POST",
    path: "/v1/inbound/address/rotate", response: InboundSettings,
    mfa: true }),
  pub({ id: "inboundEmailHook", method: "POST",
    path: "/v1/hooks/email/{provider}", params: InboundHookParams,
    response: HookAck, rawBody: true, bodyLimit: 36_000_000 }),
  ten(PAYROLL, { id: "listInboundItems", method: "GET",
    path: "/v1/inbound/items", query: InboundQuery,
    response: InboundItemList }),
  ten(PAYROLL, { id: "getInboundItem", method: "GET",
    path: "/v1/inbound/items/{id}", ...one, response: InboundItem }),
  ten(PAYROLL, { id: "downloadInboundAttachment", method: "GET",
    path: "/v1/inbound/items/{id}/attachments/{index}",
    params: InboundAttachmentParams, response: InboundAttachmentContent,
    contentType: "binary" }),
  ten(PAYROLL, { id: "acceptInboundItem", method: "POST",
    path: "/v1/inbound/items/{id}/accept", ...one, body: InboundAccept,
    response: InboundItem }),
  ten(PAYROLL, { id: "dismissInboundItem", method: "POST",
    path: "/v1/inbound/items/{id}/dismiss", ...one, body: InboundDismiss,
    response: InboundItem }),
];

/** Task 6: secret-URL calendar feeds. */
const CALENDAR: readonly RouteDef[] = [
  ten(ALL_ROLES, { id: "listCalendarFeeds", method: "GET",
    path: "/v1/me/calendar-feeds", response: CalendarFeedList }),
  ten(ALL_ROLES, { id: "createCalendarFeed", method: "POST",
    path: "/v1/me/calendar-feeds", body: CalendarFeedCreate,
    response: CalendarFeedCreated, status: 201 }),
  ten(ALL_ROLES, { id: "revokeCalendarFeed", method: "POST",
    path: "/v1/me/calendar-feeds/{id}/revoke", ...one,
    response: CalendarFeed }),
  pub({ id: "getCalendarFeed", method: "GET", path: "/v1/calendar/{token}",
    params: CalendarTokenParams, response: IcsText,
    contentType: "text/calendar" }),
];

const prov = { params: SsoProviderParams };

/** Task 7: sign-in with Google or Microsoft (OpenID Connect). */
const SSO: readonly RouteDef[] = [
  pub({ id: "ssoStart", method: "POST",
    path: "/v1/auth/sso/{provider}/start", ...prov, body: SsoStartRequest,
    response: SsoStartResponse }),
  pub({ id: "ssoCallback", method: "POST",
    path: "/v1/auth/sso/{provider}/callback", ...prov,
    body: SsoCallbackRequest, response: LoginResponse }),
  usr({ id: "ssoLinkStart", method: "POST",
    path: "/v1/me/sso-identities/{provider}/link", ...prov,
    response: SsoStartResponse }),
  usr({ id: "listSsoIdentities", method: "GET",
    path: "/v1/me/sso-identities", response: SsoIdentityList }),
  usr({ id: "unlinkSsoIdentity", method: "POST",
    path: "/v1/me/sso-identities/{id}/unlink", ...one,
    response: SsoIdentityList }),
  ten(PAYROLL, { id: "getSsoSettings", method: "GET",
    path: "/v1/sso-settings", response: SsoSettings }),
  ten(OWNER, { id: "putSsoSettings", method: "PUT",
    path: "/v1/sso-settings", body: SsoSettingsUpdate,
    response: SsoSettings, mfa: true }),
];

/** Task 8: outbound signed webhooks. */
const WEBHOOKS: readonly RouteDef[] = [
  ten(PAYROLL, { id: "listWebhookEndpoints", method: "GET",
    path: "/v1/webhook-endpoints", response: WebhookEndpointList }),
  ten(OWNER, { id: "createWebhookEndpoint", method: "POST",
    path: "/v1/webhook-endpoints", body: WebhookEndpointCreate,
    response: WebhookEndpointCreated, mfa: true, status: 201 }),
  ten(OWNER, { id: "updateWebhookEndpoint", method: "PATCH",
    path: "/v1/webhook-endpoints/{id}", ...one, body: WebhookEndpointUpdate,
    response: WebhookEndpoint, mfa: true }),
  ten(OWNER, { id: "rotateWebhookSecret", method: "POST",
    path: "/v1/webhook-endpoints/{id}/rotate-secret", ...one,
    body: WebhookSecretRotate, response: WebhookEndpointCreated,
    mfa: true }),
  ten(OWNER, { id: "testWebhookEndpoint", method: "POST",
    path: "/v1/webhook-endpoints/{id}/test", ...one,
    response: WebhookDelivery, status: 201 }),
  ten(PAYROLL, { id: "listWebhookDeliveries", method: "GET",
    path: "/v1/webhook-deliveries", query: WebhookDeliveryQuery,
    response: WebhookDeliveryList }),
  ten(OWNER, { id: "redeliverWebhook", method: "POST",
    path: "/v1/webhook-deliveries/{id}/redeliver", ...one,
    response: WebhookDelivery, status: 201 }),
];

/** Plan 13: channels and integrations (the last route group). */
export const CHANNEL_ROUTES: readonly RouteDef[] = [
  ...SETTINGS,
  ...NOTIFY,
  ...OPT_IN,
  ...WA_HOOK,
  ...INBOUND,
  ...CALENDAR,
  ...SSO,
  ...WEBHOOKS,
];
