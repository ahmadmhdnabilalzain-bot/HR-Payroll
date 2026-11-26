import { dispatchDue } from "../../src/channels/dispatch";
import { withTenant } from "../../src/db/tenant";
import type { Hitter } from "./api-flow";
import type { makeApp } from "./test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

export interface FlowUsers {
  /** Owner with an MFA session. */
  owner: string;
  /** A second owner with an MFA session. */
  owner2: string;
  /** An employee user linked to `empId`. */
  emp: string;
  empId: string;
  company: string;
}

/** One happy-path call per Plan 13 route (each task appends). */
export async function channelFlow(_ctx: Ctx, hit: Hitter, u: FlowUsers)
  : Promise<void> {
  const c = u.company;
  const s = await hit("getChannelSettings", u.owner, c);
  await hit("putChannelSettings", u.owner, c, {}, { ...settingsBody(s.body),
    emailEnabled: true, expectedVersion: s.body.version });
  await notifications(hit, u);
  await optInFlow(_ctx, hit, u);
}

async function optInFlow(ctx: Ctx, hit: Hitter, u: FlowUsers) {
  const c = u.company;
  const s = await hit("getChannelSettings", u.owner, c);
  await hit("putChannelSettings", u.owner, c, {}, { ...settingsBody(s.body),
    whatsappEnabled: true, expectedVersion: s.body.version });
  await hit("getMyChannels", u.emp, c);
  await hit("startWhatsAppOptIn", u.emp, c, {}, { phone: "+971500000077",
    consentVersion: 1, agreed: true });
  await dispatchDue((t, fn) => withTenant(ctx.deps.db, t, fn), ctx.deps);
  const sent = ctx.fakes.outbox.whatsapp.at(-1) as { bodyParams: string[] };
  await hit("verifyWhatsAppOptIn", u.emp, c, {},
    { code: sent.bodyParams[0] });
  await hit("withdrawWhatsAppOptIn", u.emp, c);
}

async function notifications(hit: Hitter, u: FlowUsers) {
  const c = u.company;
  await hit("listNotifications", u.emp, c);
  await hit("markNotificationsRead", u.emp, c, {}, { all: true });
  const p = await hit("getNotificationPrefs", u.emp, c);
  const { note: _n, ...prefs } = p.body;
  await hit("putNotificationPrefs", u.emp, c, {}, prefs);
  await hit("listNotificationDeliveries", u.owner, c);
  await hit("listNotificationTemplates", u.owner, c);
}

function settingsBody(b: Record<string, unknown>) {
  return { whatsappEnabled: b.whatsappEnabled,
    whatsappApprovals: b.whatsappApprovals,
    whatsappDailyCap: b.whatsappDailyCap,
    whatsappHourlyPerUser: b.whatsappHourlyPerUser,
    emailEnabled: b.emailEnabled };
}
