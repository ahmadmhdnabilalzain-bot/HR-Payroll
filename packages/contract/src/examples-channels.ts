import {
  CHANNEL_DEFAULTS,
  CHANNEL_DEFAULTS_NOTE,
  type ChannelSettings,
  type ProviderStatus,
} from "./channel-settings";

const providers: ProviderStatus = { email: "configured",
  whatsapp: "not-configured", inboundEmail: "not-configured",
  googleSso: "not-configured", microsoftSso: "not-configured" };

const settings: ChannelSettings = { ...CHANNEL_DEFAULTS, version: 1,
  providers, note: CHANNEL_DEFAULTS_NOTE };

/** One valid example per Plan 13 schema, keyed by schema name. */
export const CHANNEL_EXAMPLES: Readonly<Record<string, unknown>> = {
  ProviderStatus: providers,
  ChannelSettingsBody: CHANNEL_DEFAULTS,
  ChannelSettings: settings,
  ChannelSettingsUpdate: { ...CHANNEL_DEFAULTS, expectedVersion: 0 },
};
