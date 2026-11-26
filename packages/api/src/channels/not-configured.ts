import { ApiError } from "../http/errors";
import {
  HttpFailure,
  type CalendarPushAdapter,
  type ChannelPorts,
  type SsoProvider,
} from "./ports";

const NOT = { status: "not-configured" } as const;

export function notConfiguredCalendarPush(provider: SsoProvider)
  : CalendarPushAdapter {
  return { provider, configured: false,
    upsertEvent: async () => NOT, removeEvent: async () => NOT };
}

const noOidc = (): never => {
  throw new ApiError("SSO_NOT_CONFIGURED");
};

/**
 * Every port switched off: nothing is sent, no signature or credential
 * is accepted, no host resolves. Real adapters replace parts of this
 * only when their environment variables are all set.
 */
export function notConfiguredPorts(base: { publicApiBaseUrl: string |
  null; publicAppBaseUrl: string | null }): ChannelPorts {
  return {
    http: { send: async () => {
      throw new HttpFailure("NETWORK");
    } },
    email: { configured: false, send: async () => NOT },
    whatsapp: { configured: false, sendTemplate: async () => NOT,
      sendText: async () => NOT },
    whatsappInbound: { configured: false, verifySignature: () => false,
      challenge: () => null, parse: () => [] },
    inboundEmail: { configured: false, authenticate: () => false,
      parse: () => {
        throw new ApiError("INBOUND_PAYLOAD_INVALID");
      } },
    oidc: { configured: () => false, clientId: noOidc,
      authorizeUrl: noOidc, exchangeCode: noOidc, keys: noOidc },
    calendarPush: [notConfiguredCalendarPush("google"),
      notConfiguredCalendarPush("microsoft")],
    resolveHost: async () => [],
    publicApiBaseUrl: base.publicApiBaseUrl,
    publicAppBaseUrl: base.publicAppBaseUrl,
    inboundEmailDomain: null,
  };
}
