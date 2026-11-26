import type { Area } from "../types";

const IT = ["hr", "gm"] as const;

/**
 * WP9: access, connections and data (navigation map, section 7). The
 * demo has no IT role, so the HR manager and the General manager see
 * these (they hold access.manage and access.review in the data).
 */
const area = (id: string, group: string, en: string, archetype: Area[
  "archetype"], rest: string[], keywords: string): Area => ({ id,
  section: "setup", group, label: { en, ar: en }, status: "live",
  archetype, roles: IT, route: { section: "setup", rest }, keywords });

export const AREAS: readonly Area[] = [
  area("setup.users", "access", "Users and roles", "LF",
    ["access", "users"], "S20 people sign in account login permission"),
  area("setup.roles", "access", "Roles", "LF", ["access", "roles"],
    "S20 role permissions admin"),
  area("setup.who", "access", "Permissions", "LF", ["access", "who"],
    "S20 who can do what matrix permissions approve"),
  area("setup.rules", "access", "Sign-off rules", "ST",
    ["access", "rules"], "S21 approval rules limits expense maker checker"),
  area("setup.separation", "access", "Duties kept apart", "ST",
    ["access", "separation"], "S22 sod conflict four eyes"),
  area("setup.signin", "access", "Sign-in", "ST",
    ["access", "sign-in"], "S23 sign-in second step sso mfa two factor " +
      "password"),
  area("setup.review", "access", "Access review", "LF",
    ["access", "review"], "S24 recertify audit sign off"),
  area("setup.keys", "connections", "API keys", "LF",
    ["connections", "keys"], "S30 api token integration"),
  area("setup.hooks", "connections", "Webhooks", "LF",
    ["connections", "hooks"], "S31 events delivery"),
  area("setup.import", "data", "Data import", "SF", ["data", "import"],
    "S37 old system cut-over migrate csv upload"),
  area("setup.location", "data", "Data location", "LF",
    ["data", "location"], "S39 data location export residency backup security"),
];
