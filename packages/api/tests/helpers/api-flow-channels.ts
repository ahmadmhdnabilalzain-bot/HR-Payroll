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
}

function settingsBody(b: Record<string, unknown>) {
  return { whatsappEnabled: b.whatsappEnabled,
    whatsappApprovals: b.whatsappApprovals,
    whatsappDailyCap: b.whatsappDailyCap,
    whatsappHourlyPerUser: b.whatsappHourlyPerUser,
    emailEnabled: b.emailEnabled };
}
