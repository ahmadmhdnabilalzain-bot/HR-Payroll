import { buildClient } from "../build-client";
import type { ApiClient, ApiMethod, AuthSource } from "../client";
import { ApiError, errorFromBody } from "../errors";
import { CLIENT_ROUTES } from "../routes-map";
import {
  fillPath,
  parseResponse,
  queryString,
  type WireRequest,
} from "../transport";

/** Auth transport lives only here: bearer token and company header. */
function headersFor(
  m: ApiMethod,
  req: WireRequest,
  auth: AuthSource,
): Headers {
  const route = CLIENT_ROUTES[m];
  const h = new Headers(req.headers);
  if (req.body !== undefined) h.set("content-type", "application/json");
  const token = auth.token();
  if (route.auth !== "public" && token !== null) {
    h.set("authorization", `Bearer ${token}`);
  }
  const company = auth.companyId();
  if (route.auth === "tenant" && company !== null) {
    h.set("x-company-id", company);
  }
  return h;
}

async function send(
  fetchFn: typeof fetch,
  url: string,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetchFn(url, init);
  } catch (e) {
    throw new ApiError("NETWORK", String(e), {});
  }
}

async function readBody(res: Response, text: boolean): Promise<unknown> {
  if (res.status === 204) return null;
  const raw = await res.text();
  if (text) return raw;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new ApiError("CONTRACT_MISMATCH", "response is not JSON",
      { status: res.status, detail: { status: String(res.status) } });
  }
}

export function createHttpApi(
  base: string,
  auth: AuthSource,
  fetchFn: typeof fetch,
): ApiClient {
  return buildClient(async (m, req) => {
    const route = CLIENT_ROUTES[m];
    const url = base + fillPath(route.path, req.params ?? {}) +
      queryString(req.query);
    const init: RequestInit = {
      method: route.method,
      headers: headersFor(m, req, auth),
      ...(req.body === undefined ? {} : { body: JSON.stringify(req.body) }),
    };
    const res = await send(fetchFn, url, init);
    const ok = res.status >= 200 && res.status < 300;
    const isText = ok && route.contentType === "text/plain";
    const body = await readBody(res, isText);
    if (!ok) throw errorFromBody(res.status, body);
    return parseResponse(m, body);
  });
}
