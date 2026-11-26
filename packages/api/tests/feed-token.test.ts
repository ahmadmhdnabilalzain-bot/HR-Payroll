import { FEED_TOKEN_RE } from "@payroll/contract";
import { describe, expect, it } from "vitest";
import { formatFeedToken, parseFeedToken } from "../src/calendar/feed-token";

const C = "00000000-0000-4000-8000-00000000000a";
const F = "00000000-0000-4000-8000-0000000000f1";
const SECRET = new Uint8Array(32).fill(5);

describe("feed tokens", () => {
  it("format then parse round-trips", () => {
    const t = formatFeedToken(C, F, SECRET);
    expect(FEED_TOKEN_RE.test(t)).toBe(true);
    expect(parseFeedToken(t)).toEqual({ companyId: C, feedId: F,
      secret: Buffer.from(SECRET).toString("base64url") });
  });
  it("refuses near misses", () => {
    const t = formatFeedToken(C, F, SECRET);
    expect(parseFeedToken(t.replace(/\.ics$/, ""))).toBeNull();
    expect(parseFeedToken(t.replace("cal1.0", "cal1.A"))).toBeNull();
    const parts = t.split(".");
    parts[3] = parts[3]!.slice(1);
    expect(parseFeedToken(parts.join("."))).toBeNull();
  });
});
