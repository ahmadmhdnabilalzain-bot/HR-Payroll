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

function send(r: HttpRequest): Promise<HttpResponse> {
  const url = new URL(r.url);
  if (url.protocol !== "https:") {
    return Promise.reject(new HttpFailure("NETWORK"));
  }
  return new Promise((resolve, reject) => {
    const req = request(url, { method: r.method, headers: r.headers,
      timeout: r.timeoutMs,
      ...(r.pinAddress === undefined ? {} : { lookup: pinned(r.pinAddress) }),
    }, (res) => {
      const chunks: Buffer[] = [];
      let size = 0;
      res.on("data", (c: Buffer) => {
        if (size < MAX_BODY) chunks.push(c.subarray(0, MAX_BODY - size));
        size += c.length;
      });
      res.on("end", () => resolve({ status: res.statusCode ?? 0,
        headers: headersOf(res.headers),
        body: Buffer.concat(chunks).toString("utf8") }));
      res.on("error", (e) => reject(failure(e)));
    });
    req.on("timeout", () => req.destroy(new HttpFailure("TIMEOUT")));
    req.on("error", (e) => reject(e instanceof HttpFailure ? e
      : failure(e)));
    if (r.body !== undefined) req.write(r.body);
    req.end();
  });
}

/** The real client: https only, no redirects followed, pinned lookup. */
export function nodeHttpClient(): HttpClient {
  return { send };
}
