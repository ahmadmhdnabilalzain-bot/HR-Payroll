import { createServer, request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sendWith } from "../src/channels/http-node";

/**
 * Security review I5: a server that trickles one byte every 200 ms
 * never trips Node's idle timeout. The overall deadline must end the
 * call, and reading must stop at the body cap.
 */
let server: Server;
let base = "";
beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === "/big") {
      res.writeHead(200);
      res.write(Buffer.alloc(70_000, 97));
      // Never ends: only the body cap can finish this call.
      return;
    }
    res.writeHead(200);
    const t = setInterval(() => res.write("x"), 200);
    res.on("close", () => clearInterval(t));
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => {
  server.closeAllConnections();
  server.close();
});

const send = sendWith(request, "http:");

describe("outbound HTTP deadline", () => {
  it("a trickling server is cut off at the deadline", async () => {
    const t0 = performance.now();
    await expect(send({ method: "POST", url: `${base}/slow`, headers: {},
      body: "{}", timeoutMs: 1000 })).rejects.toMatchObject(
      { code: "TIMEOUT" });
    const ms = performance.now() - t0;
    expect(ms).toBeGreaterThanOrEqual(900);
    expect(ms).toBeLessThan(3000);
  });
  it("reading stops at the body cap", async () => {
    const r = await send({ method: "GET", url: `${base}/big`, headers: {},
      timeoutMs: 5000 });
    expect(r.status).toBe(200);
    expect(r.body.length).toBe(65_536);
  });
  it("the real client refuses plain http", async () => {
    await expect(sendWith(request, "https:")({ method: "GET",
      url: `${base}/slow`, headers: {}, timeoutMs: 1000 }))
      .rejects.toMatchObject({ code: "NETWORK" });
  });
});
