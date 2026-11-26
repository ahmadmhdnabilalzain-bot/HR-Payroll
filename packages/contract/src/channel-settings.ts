import { z } from "zod";

/** Whether an outside provider's environment variables are all set. */
export const ProviderState = z.enum(["configured", "not-configured"]);
export type ProviderState = z.infer<typeof ProviderState>;

export const ProviderStatus = z.object({
  email: ProviderState,
  whatsapp: ProviderState,
  inboundEmail: ProviderState,
  googleSso: ProviderState,
  microsoftSso: ProviderState,
});
export type ProviderStatus = z.infer<typeof ProviderStatus>;

export const ChannelSettingsBody = z.object({
  whatsappEnabled: z.boolean(),
  whatsappApprovals: z.boolean(),
  whatsappDailyCap: z.number().int().min(0).max(100_000),
  whatsappHourlyPerUser: z.number().int().min(1).max(200),
  emailEnabled: z.boolean(),
});
export type ChannelSettingsBody = z.infer<typeof ChannelSettingsBody>;

/** Product defaults, not provider limits (Ruling 15). */
export const CHANNEL_DEFAULTS: ChannelSettingsBody = {
  whatsappEnabled: false,
  whatsappApprovals: false,
  whatsappDailyCap: 200,
  whatsappHourlyPerUser: 20,
  emailEnabled: true,
};

export const CHANNEL_DEFAULTS_NOTE = "Product defaults, not provider " +
  "limits or law. Change them to suit your company.";

export const ChannelSettings = ChannelSettingsBody.extend({
  version: z.number().int().min(0),
  providers: ProviderStatus,
  note: z.literal(CHANNEL_DEFAULTS_NOTE),
});
export type ChannelSettings = z.infer<typeof ChannelSettings>;

export const ChannelSettingsUpdate = ChannelSettingsBody.extend({
  expectedVersion: z.number().int().min(0),
});
export type ChannelSettingsUpdate = z.infer<typeof ChannelSettingsUpdate>;
