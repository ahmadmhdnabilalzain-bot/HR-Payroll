import { ActivityCategory, type WfhStatus } from "@payroll/contract";
import { describe, expect, it } from "vitest";
import {
  assertAgentCapabilities,
  browserLocationSource,
  categorise,
  chooseLocationSource,
  createActivityMeter,
  createHourlySampler,
  indicatorFor,
  type AgentCapabilities,
  type GeoReading,
  type LocationSource,
} from "../src/index";

const collects = { activeTime: true as const, categories: true,
  locationHourly: true };
const status = (o: Partial<WfhStatus> = {}): WfhStatus => ({
  state: "tracking", attendanceId: "00000000-0000-4000-8000-000000000001",
  trackedUntil: null, lastLocationAt: null,
  nextLocationDueAt: "2026-03-01T10:00:00.000Z", collects,
  noticeVersion: 1, ...o });
const src = (kind: "phone" | "browser", ok: boolean, log: string[] = [],
  fail = false): LocationSource => ({ kind,
  available: async () => ok,
  current: async (): Promise<GeoReading> => {
    log.push("current");
    if (fail) throw new Error("denied");
    return { lat: 1.5, lng: 1.5, accuracyM: 20 };
  } });

describe("location sources", () => {
  it("phone first, then browser, else null", async () => {
    expect((await chooseLocationSource(src("phone", true),
      src("browser", true)))?.kind).toBe("phone");
    expect((await chooseLocationSource(src("phone", false),
      src("browser", true)))?.kind).toBe("browser");
    expect(await chooseLocationSource(src("phone", false),
      src("browser", false))).toBeNull();
  });
  it("browser source: unavailable without geolocation; maximumAge 0",
    async () => {
      expect(await browserLocationSource(undefined).available()).toBe(false);
      let opts: unknown;
      const s = browserLocationSource({ getCurrentPosition: (ok, _e, o) => {
        opts = o;
        ok({ coords: { latitude: 1, longitude: 2, accuracy: 3 } });
      } });
      expect(await s.current()).toEqual({ lat: 1, lng: 2, accuracyM: 3 });
      expect(opts).toMatchObject({ maximumAge: 0 });
    });
});

describe("indicator", () => {
  it("texts and visibility", () => {
    const v = indicatorFor(status(), "phone");
    expect(v).toMatchObject({ visible: true, textAr: null, textEn:
      "Tracking on: active time, app categories, location once an hour" });
    expect(indicatorFor(status({ collects: { ...collects,
      locationHourly: false } }), "phone").textEn)
      .toBe("Tracking on: active time, app categories");
    expect(indicatorFor(status(), "browser").lines)
      .toContain("Location only while this page is open");
    expect(indicatorFor(status({ state: "ready" }), null).visible)
      .toBe(false);
    expect(indicatorFor(status({ state: "paused" }), null).textEn)
      .toBe("Tracking paused");
    expect(indicatorFor(status({ state: "stopped-limit" }), null).textEn)
      .toBe("Clock-out missing: tracking stopped");
  });
});

function harness(st: WfhStatus, source: LocationSource | null,
  now: string) {
  const log: string[] = [];
  const posted: unknown[] = [];
  const sampler = createHourlySampler({
    api: { status: async () => { log.push("status"); return st; },
      postLocation: async (b) => { log.push("postLocation");
        posted.push(b); },
      postActivity: async () => undefined },
    source: source === null ? null : { ...source, current: async () => {
      log.push("current"); return source.current(); } },
    indicator: { show: (v) => log.push(`show(${v.state})`) },
    clock: { now: () => new Date(now) } });
  return { sampler, log, posted };
}

describe("hourly sampler", () => {
  it("sampler_shows_indicator_before_reading", async () => {
    const h = harness(status(), src("phone", true),
      "2026-03-01T10:00:00.000Z");
    expect(await h.sampler.tick()).toBe("sampled");
    expect(h.log).toEqual(["status", "show(tracking)", "current",
      "postLocation"]);
    expect(h.posted[0]).toMatchObject({ indicatorShown: true,
      source: "phone", at: "2026-03-01T10:00:00.000Z" });
  });
  it("sampler_hourly_by_server_time", async () => {
    const early = harness(status(), src("phone", true),
      "2026-03-01T09:59:00.000Z");
    expect(await early.sampler.tick()).toBe("not-due");
  });
  it("sampler_paused_and_stopped_never_read", async () => {
    for (const state of ["paused", "stopped-limit"] as const) {
      const h = harness(status({ state }), src("phone", true),
        "2026-03-01T10:00:00.000Z");
      expect(await h.sampler.tick()).toBe("not-tracking");
      expect(h.log).toEqual(["status", `show(${state})`]);
    }
  });
  it("sampler_location_error_visible", async () => {
    const shown: string[] = [];
    const s = createHourlySampler({ api: { status: async () => status(),
      postLocation: async () => undefined,
      postActivity: async () => undefined },
    source: src("phone", true, [], true),
    indicator: { show: (v) => shown.push(`${v.state}:${v.visible}`) },
    clock: { now: () => new Date("2026-03-01T10:00:00.000Z") } });
    expect(await s.tick()).toBe("location-error");
    expect(shown).toContain("location-error:true");
  });
});

describe("activity meter", () => {
  it("one yes or no per minute, nothing else", () => {
    let now = new Date("2026-03-01T10:00:30.000Z");
    const m = createActivityMeter({ now: () => now },
      new Date("2026-03-01T10:00:00.000Z"));
    expect(m.noteInput.length).toBe(0);
    m.noteInput();
    now = new Date("2026-03-01T10:02:10.000Z");
    m.noteInput();
    now = new Date("2026-03-01T10:04:00.000Z");
    const out = m.drain();
    expect(out.map((x) => x.active)).toEqual([true, false, true, false]);
    for (const x of out) {
      expect(Object.keys(x).sort()).toEqual(["active", "at", "category"]);
      expect(x.category).toBeNull();
    }
    expect(m.drain()).toEqual([]);
  });
});

describe("categories and agent", () => {
  it("categorise", () => {
    expect(categorise("docs.example.com")).toBe("documents");
    expect(categorise("unknown.thing")).toBe("other");
    expect(ActivityCategory.options).toContain(categorise("x"));
  });
  it("assertAgentCapabilities", () => {
    const ok: AgentCapabilities = { activeTime: true, categories: true,
      screenshots: false, keystrokes: false, pageContents: false,
      windowTitles: false, webAddresses: false };
    expect(assertAgentCapabilities(ok)).toEqual(ok);
    for (const bad of [{ ...ok, screenshots: true },
      { ...ok, keystrokes: true }, { ...ok, screenVideo: false }]) {
      expect(() => assertAgentCapabilities(bad)).toThrow(
        expect.objectContaining({ code: "FORBIDDEN_CAPABILITY" }));
    }
    // @ts-expect-error screenshots can only be false
    const typed: AgentCapabilities = { ...ok, screenshots: true };
    expect(typed).toBeDefined();
  });
});
