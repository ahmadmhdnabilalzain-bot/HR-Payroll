type Env = Record<string, string | undefined>;

export interface ChannelConfig {
  email: { token: string; from: string } | null;
  whatsapp: { phoneNumberId: string; accessToken: string;
    appSecret: string; verifyToken: string; graphVersion: string } | null;
  inbound: { domain: string; basicAuth: string;
    /** The provider's authserv-id; null: sender results unverified. */
    authservId: string | null } | null;
  google: { clientId: string; clientSecret: string } | null;
  microsoft: { clientId: string; clientSecret: string } | null;
}

const GROUPS = {
  EMAIL: ["POSTMARK_SERVER_TOKEN", "EMAIL_FROM"],
  WHATSAPP: ["WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_APP_SECRET", "WHATSAPP_VERIFY_TOKEN",
    "WHATSAPP_GRAPH_VERSION"],
  INBOUND: ["INBOUND_EMAIL_DOMAIN", "INBOUND_EMAIL_BASIC_AUTH"],
  GOOGLE_SSO: ["GOOGLE_OIDC_CLIENT_ID", "GOOGLE_OIDC_CLIENT_SECRET"],
  ENTRA_SSO: ["ENTRA_CLIENT_ID", "ENTRA_CLIENT_SECRET"],
} as const;

/** All of a group's values, none (null), or a throw naming the gaps. */
function group(env: Env, name: keyof typeof GROUPS): string[] | null {
  const names = GROUPS[name];
  const set = names.filter((n) => (env[n] ?? "") !== "");
  if (set.length === 0) return null;
  if (set.length < names.length) {
    const missing = names.filter((n) => !set.includes(n));
    throw new Error(`${name} settings are incomplete: ${missing.join(", ")}`);
  }
  return names.map((n) => env[n]!);
}

/** Optional https base URL without a trailing slash. */
export function httpsUrl(env: Env, name: string): string | null {
  const v = env[name];
  if (v === undefined || v === "") return null;
  let ok = false;
  try {
    ok = new URL(v).protocol === "https:";
  } catch {
    ok = false;
  }
  if (!ok) throw new Error(`${name} must be an https URL`);
  return v.replace(/\/+$/, "");
}

export function loadChannelConfig(env: Env): ChannelConfig {
  const e = group(env, "EMAIL");
  const w = group(env, "WHATSAPP");
  const i = group(env, "INBOUND");
  const g = group(env, "GOOGLE_SSO");
  const m = group(env, "ENTRA_SSO");
  return {
    email: e && { token: e[0]!, from: e[1]! },
    whatsapp: w && { phoneNumberId: w[0]!, accessToken: w[1]!,
      appSecret: w[2]!, verifyToken: w[3]!, graphVersion: w[4]! },
    inbound: i && { domain: i[0]!, basicAuth: i[1]!,
      authservId: (env.INBOUND_EMAIL_AUTHSERV_ID ?? "") === "" ? null
        : env.INBOUND_EMAIL_AUTHSERV_ID! },
    google: g && { clientId: g[0]!, clientSecret: g[1]! },
    microsoft: m && { clientId: m[0]!, clientSecret: m[1]! },
  };
}
