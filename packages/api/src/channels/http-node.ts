import { request } from "node:https";
import type { LookupFunction } from "node:net";
import {
  HttpFailure,
  type HttpClient,
  type HttpRequest,
  type HttpResponse,
} from "./ports";

/** Response bodies beyond this are dropped (never stored anyway). */
const MAX_BODY = 65_536;

/** A lookup that always answers the pinned (already checked) address. */
function pinned(address: string): LookupFunction {
  const family = address.includes(":") ? 6 : 4;
  return (_host, opts, cb) => {
    if ((opts as { all?: boolean }).all) cb(null, [{ address, family }]);
    else cb(null, address, family);
  };
}

function headersOf(h: Record<string, string | string[] | undefined>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h)) {
    if (v !== undefined) out[k] = Array.isArray(v) ? v.join(", ") : v;
  }
  return out;
}

function failure(err: unknown): HttpFailure {
  const code = String((err as { code?: unknown }).code ?? "");
  if (code === "ETIMEDOUT" || code === "TIMEOUT") {
    return new HttpFailure("TIMEOUT");
  }
  return new HttpFailure(/CERT|TLS|SSL/.test(code) ? "TLS" : "NETWORK");
}

type RequestFn = typeof request;

/**
 * One request with an overall deadline (security review I5): the timer
 * destroys the request however slowly the server trickles bytes, and
 * reading stops (the socket is destroyed) once MAX_BODY is reached.
 * `requestFn` and `scheme` are a seam for the local trickle test.
 */
export function sendWith(requestFn: RequestFn, scheme: string) {
  return (r: HttpRequest): Promise<HttpResponse> => {
    const url = new URL(r.url);
    if (url.protocol !== scheme) {
      return Promise.reject(new HttpFailure("NETWORK"));
    }
    return new Promise((resolve, reject) => {
      let done = false;
      const settle = (fn: () => void) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        fn();
      };
      const req = requestFn(url, { method: r.method, headers: r.headers,
        timeout: r.timeoutMs, ...(r.pinAddress === undefined ? {}
          : { lookup: pinned(r.pinAddress) }) }, (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        const finish = () => settle(() => resolve({
          status: res.statusCode ?? 0, headers: headersOf(res.headers),
          body: Buffer.concat(chunks).toString("utf8") }));
        res.on("data", (c: Buffer) => {
          chunks.push(c.subarray(0, MAX_BODY - size));
          size += c.length;
          if (size >= MAX_BODY) {
            finish();
            res.destroy();
          }
        });
        res.on("end", finish);
        res.on("error", (e) => settle(() => reject(failure(e))));
      });
      const timer = setTimeout(() => {
        const e = new HttpFailure("TIMEOUT");
        settle(() => reject(e));
        req.destroy(e);
      }, r.timeoutMs);
      req.on("timeout", () => req.destroy(new HttpFailure("TIMEOUT")));
      req.on("error", (e) => settle(() => reject(e instanceof HttpFailure
        ? e : failure(e))));
      if (r.body !== undefined) req.write(r.body);
      req.end();
    });
  };
}

/** The real client: https only, no redirects followed, pinned lookup. */
export function nodeHttpClient(): HttpClient {
  return { send: sendWith(request, "https:") };
}
