import { ApiError } from "../http/errors";
import type { HttpClient, OidcClient, SsoProvider } from "../channels/ports";

// UNVERIFIED: discovery URLs, endpoint and field names from general
// knowledge (the research did not READ them). One file.
const DISCOVERY: Record<SsoProvider, string> = {
  google: "https://accounts.google.com/.well-known/openid-configuration",
  microsoft: "https://login.microsoftonline.com/organizations/v2.0/" +
    ".well-known/openid-configuration",
};

type Creds = { clientId: string; clientSecret: string };
interface Disc { authorization_endpoint: string; token_endpoint: string;
  jwks_uri: string }

async function getJson(http: HttpClient, url: string): Promise<any> {
  const r = await http.send({ method: "GET", url, headers: {},
    timeoutMs: 10_000 });
  if (r.status !== 200) throw new ApiError("SSO_FAILED");
  return JSON.parse(r.body);
}

export function httpOidcClient(http: HttpClient, cfg: Partial<Record<
  SsoProvider, Creds>>): OidcClient {
  // Discovery is cached for the process (no clock read outside deps).
  const cache = new Map<SsoProvider, Disc>();
  const creds = (p: SsoProvider) => {
    const c = cfg[p];
    if (c === undefined) throw new ApiError("SSO_NOT_CONFIGURED");
    return c;
  };
  const disc = async (p: SsoProvider): Promise<Disc> => {
    const hit = cache.get(p);
    if (hit !== undefined) return hit;
    const d = await getJson(http, DISCOVERY[p]) as Disc;
    cache.set(p, d);
    return d;
  };
  const auth: Record<SsoProvider, string> = {
    google: "https://accounts.google.com/o/oauth2/v2/auth",
    microsoft: "https://login.microsoftonline.com/organizations/oauth2/" +
      "v2.0/authorize" };
  return {
    configured: (p) => cfg[p] !== undefined,
    clientId: (p) => creds(p).clientId,
    authorizeUrl: (p, a) => `${auth[p]}?${new URLSearchParams({
      response_type: "code", client_id: creds(p).clientId,
      scope: "openid email profile", state: a.state, nonce: a.nonce,
      code_challenge: a.codeChallenge, code_challenge_method: "S256",
      redirect_uri: a.redirectUri })}`,
    async exchangeCode(p, a) {
      const c = creds(p);
      const r = await http.send({ method: "POST",
        url: (await disc(p)).token_endpoint, timeoutMs: 10_000,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "authorization_code",
          code: a.code, code_verifier: a.codeVerifier,
          redirect_uri: a.redirectUri, client_id: c.clientId,
          client_secret: c.clientSecret }).toString() });
      const idToken = r.status === 200 ? JSON.parse(r.body).id_token : null;
      if (typeof idToken !== "string") throw new ApiError("SSO_FAILED");
      return { idToken };
    },
    keys: async (p) => (await getJson(http, (await disc(p)).jwks_uri))
      .keys ?? [],
  };
}
