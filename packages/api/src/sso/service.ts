import type {
  LoginResponse,
  SsoCallbackRequest,
  SsoStartRequest,
} from "@payroll/contract";
import { userById } from "../auth/accounts";
import { consumeTotp, signedIn } from "../auth/login";
import { findSession } from "../auth/session";
import type { SsoProvider } from "../channels/ports";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { inviteAccept, linkIdentity, loginUser } from "./accounts";
import { IdTokenError, ISSUER_OK, verifyIdToken } from "./id-token";
import { identityFromClaims, type Identity } from "./identity";
import { consumeState, createState } from "./states";

type P = { provider: SsoProvider };
const NO_TENANT = { companyId: null, userId: null };

function redirectUri(ctx: ReqCtx, p: SsoProvider): string {
  const base = ctx.deps.channels.publicAppBaseUrl;
  if (!ctx.deps.channels.oidc.configured(p) || base === null) {
    throw new ApiError("SSO_NOT_CONFIGURED");
  }
  return `${base}/auth/sso/${p}/callback`;
}

async function startFor(ctx: ReqCtx, p: SsoProvider,
  intent: "login" | "invite" | "link",
  extra: { userId?: string; inviteToken?: string }, run: ReqCtx["enter"]) {
  const uri = redirectUri(ctx, p);
  const s = await run(NO_TENANT, (tx) => createState(tx, ctx.deps, p,
    intent, extra));
  return { authorizeUrl: ctx.deps.channels.oidc.authorizeUrl(p, {
    state: s.state, nonce: s.nonce, codeChallenge: s.challenge,
    redirectUri: uri }), expiresAt: s.expiresAt };
}

/** POST /v1/auth/sso/{provider}/start (public). */
export function ssoStart(ctx: ReqCtx<SsoStartRequest, unknown, P>) {
  const b = ctx.body;
  if (b.intent === "invite" && !/^[0-9a-f-]{36}\.[A-Za-z0-9_-]{16,200}$/
    .test(b.inviteToken ?? "")) throw new ApiError("INVITE_INVALID");
  return startFor(ctx, ctx.params.provider, b.intent,
    b.inviteToken === undefined ? {} : { inviteToken: b.inviteToken },
    ctx.enter);
}

/** POST /v1/me/sso-identities/{provider}/link (signed in). */
export function ssoLinkStart(ctx: ReqCtx<unknown, unknown, P>) {
  if (ctx.user!.mfa_enrolled && !ctx.session!.mfa) {
    throw new ApiError("MFA_REQUIRED");
  }
  return startFor(ctx, ctx.params.provider, "link",
    { userId: ctx.user!.id }, (_t, fn) => fn(ctx.tx));
}

async function identityOf(ctx: ReqCtx, p: SsoProvider, code: string,
  st: { verifier: string; nonce: string }): Promise<Identity> {
  const oidc = ctx.deps.channels.oidc;
  try {
    const { idToken } = await oidc.exchangeCode(p, { code,
      codeVerifier: st.verifier, redirectUri: redirectUri(ctx, p) });
    const claims = verifyIdToken(idToken, await oidc.keys(p), {
      audience: oidc.clientId(p), nonce: st.nonce,
      nowSec: Math.floor(ctx.deps.now().getTime() / 1000),
      issuerOk: ISSUER_OK[p] });
    return identityFromClaims(p, claims);
  } catch (e) {
    if (e instanceof IdTokenError) {
      throw new ApiError("SSO_FAILED", undefined, { reason: e.reason });
    }
    throw e;
  }
}

/** The bearer session's user, for a link callback (else null). */
async function bearerUser(ctx: ReqCtx): Promise<string | null> {
  const m = /^Bearer ([A-Za-z0-9_-]{16,200})$/.exec(
    ctx.rawHeader?.("authorization") ?? "");
  if (m === null) return null;
  const s = await ctx.enter(NO_TENANT, (tx) => findSession(tx, m[1]!,
    ctx.deps.now()));
  return s?.userId ?? null;
}

async function session(ctx: ReqCtx<SsoCallbackRequest>, userId: string,
  p: SsoProvider): Promise<LoginResponse> {
  return ctx.enter({ companyId: null, userId }, async (tx) => {
    const u = (await userById(tx, userId))!;
    // A locked or service account gets the same answer as no link.
    const locked = u.locked_until !== null &&
      Date.parse(u.locked_until) > ctx.deps.now().getTime();
    if (locked || u.kind === "service") throw new ApiError("SSO_NOT_LINKED");
    let mfa = false;
    if (ctx.body.totp !== undefined) {
      mfa = u.mfa_enrolled && await consumeTotp(tx, ctx.deps, u,
        ctx.body.totp);
      if (!mfa) throw new ApiError("INVALID_CREDENTIALS");
    }
    return signedIn(tx, ctx.deps, userId, mfa, `sso:${p}`);
  });
}

/** POST /v1/auth/sso/{provider}/callback (public). */
export async function ssoCallback(ctx: ReqCtx<SsoCallbackRequest, unknown,
  P>): Promise<LoginResponse> {
  const p = ctx.params.provider;
  const st = await ctx.enter(NO_TENANT, (tx) => consumeState(tx, ctx.deps,
    p, ctx.body.state));
  const id = await identityOf(ctx, p, ctx.body.code, st);
  let userId: string;
  if (st.intent === "link") {
    const me = await bearerUser(ctx);
    if (me === null || me !== st.user_id) {
      throw new ApiError("SSO_STATE_INVALID");
    }
    userId = await linkIdentity(ctx, p, id, me);
  } else if (st.intent === "invite") {
    userId = await inviteAccept(ctx, p, id, st.inviteToken!);
  } else {
    userId = await loginUser(ctx, p, id);
  }
  return session(ctx, userId, p);
}
