import { ChannelSettings, ChannelSettingsUpdate } from "./channel-settings";
import { OWNER, PAYROLL, ten, type RouteDef } from "./route-def";

/** Task 1: company channel settings. */
const SETTINGS: readonly RouteDef[] = [
  ten(PAYROLL, { id: "getChannelSettings", method: "GET",
    path: "/v1/channel-settings", response: ChannelSettings }),
  ten(OWNER, { id: "putChannelSettings", method: "PUT",
    path: "/v1/channel-settings", body: ChannelSettingsUpdate,
    response: ChannelSettings, mfa: true }),
];

/** Plan 13: channels and integrations (the last route group). */
export const CHANNEL_ROUTES: readonly RouteDef[] = [
  ...SETTINGS,
];
