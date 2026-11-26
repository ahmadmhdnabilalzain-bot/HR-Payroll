import { describe, expect, it } from "vitest";
import {
  buildDemoCompany,
  ESIGN_CONSENT,
  ESIGN_KINDS,
  ESIGN_NOTE,
  esignDocs,
  esignEmployeeOf,
  esignPacks,
  esignProgress,
  esignRef,
  esignText,
  joiningPack,
  PACK_KINDS,
  signingProfile,
  signingProfiles,
  type DemoCompany,
  type EsignDoc,
  type EsignMark,
  type Joiner,
} from "../src/index";
import { BANNED_WORDS, SEEDS, asText } from "./wpd-scan";

const each = (fn: (c: DemoCompany) => void) =>
  SEEDS.forEach((s) => fn(buildDemoCompany(s)));
const ISO = /\b\d{4}-\d{2}-\d{2}\b/;
const BANNED = new RegExp(`${BANNED_WORDS.source}|\\bcompliant\\b`, "i");
const KEYS = "iso|id|employeeId|subjectId|personId|by|key|packKey|" +
  "sourceId|offerId";
const shown = (x: unknown): string => asText(x).replace(
  new RegExp(`"(${KEYS})":"[^"]*"`, "g"), "");

const hire: Joiner = { key: "hire-new-1", employeeId: null, offerId: null,
  name: "Noor Al Hashimi", title: "Teller", startOn: "2026-11-16",
  registeredOn: "2026-10-27", source: "new-hire" };

const mark = (d: EsignDoc, order: number,
  verdict: EsignMark["verdict"] = "signed"): EsignMark => {
  const s = d.signers.find((x) => x.order === order)!;
  return { order, verdict, by: s.personId, name: s.name, role: s.role,
    on: { iso: "2026-10-27", display: "27 October" }, time: "10:00",
    method: "typed", typed: s.name, path: null, reason: null,
    ref: esignRef(d.id, order) };
};

describe("D5 e-sign documents", () => {
  it("every kind has at least one document, for every seed", () =>
    each((c) => {
      const kinds = new Set(esignDocs(c).map((d) => d.kind));
      for (const k of ESIGN_KINDS) expect(kinds.has(k)).toBe(true);
    }));
  it("ids are unique, signers are in order from 1", () => each((c) => {
    const docs = esignDocs(c);
    expect(new Set(docs.map((d) => d.id)).size).toBe(docs.length);
    for (const d of docs) {
      expect(d.signers.map((s) => s.order))
        .toEqual(d.signers.map((_, i) => i + 1));
      expect(d.lines.length).toBeGreaterThan(2);
    }
  }));
  it("the text hashed starts with the version and is the shown lines",
    () => each((c) => {
      const d = esignDocs(c)[0]!;
      expect(esignText(d).split("\n").slice(1)).toEqual(d.lines);
      expect(esignText(d).startsWith("mubinflow-esig-v1\n")).toBe(true);
    }));
  it("letters are signed by the General manager; issued ones signed",
    () => each((c) => {
      const docs = esignDocs(c);
      const lt1 = docs.find((d) => d.id === "letter:lt-1")!;
      expect(lt1.signers).toHaveLength(1);
      expect(lt1.signers[0]!.party).toBe("company");
      expect(esignProgress(lt1).word).toBe("Signed");
      expect(esignProgress(docs.find((d) => d.id === "letter:lt-2")!).word)
        .toBe("Awaiting signature");
    }));
  it("a warning needs the issuer, then the employee's acknowledgement",
    () => each((c) => {
      const d = esignDocs(c).find((x) => x.kind === "warning" &&
        esignProgress(x).word === "Awaiting signature")!;
      expect(d.signers.map((s) => s.party)).toEqual(["company",
        "employee"]);
      expect(d.signers[1]!.signsAs).toBe("Acknowledged by the employee");
    }));
  it("the declined offer reads Declined", () => each((c) => {
    const words = esignDocs(c).filter((d) => d.kind === "offer-letter" &&
      d.id.startsWith("offer:")).map((d) => esignProgress(d).word);
    expect(words).toContain("Declined");
    expect(words).toContain("Signed");
    expect(words).toContain("Awaiting signature");
  }));
  it("the employee has documents to sign", () => each((c) => {
    const me = esignEmployeeOf(c);
    const mine = esignDocs(c).filter((d) =>
      esignProgress(d).next?.personId === me);
    expect(mine.length).toBeGreaterThanOrEqual(2);
  }));
  it("reference codes are short, stable and unique per line", () => {
    expect(esignRef("letter:lt-1", 1)).toBe(esignRef("letter:lt-1", 1));
    expect(esignRef("letter:lt-1", 1)).not.toBe(esignRef("letter:lt-1", 2));
    expect(esignRef("letter:lt-1", 1))
      .toMatch(/^ES-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/);
  });
  it("no banned words, no raw dates on show, .test addresses only",
    () => each((c) => {
      const t = shown([esignDocs(c), signingProfiles(c), ESIGN_NOTE,
        ESIGN_CONSENT]);
      expect(t).not.toMatch(BANNED);
      expect(t).not.toMatch(ISO);
      for (const m of t.match(/[\w.]+@[\w.-]+/g) ?? []) {
        expect(m).toMatch(/\.test$/);
      }
    }));
  it("the note claims no legal validity", () => {
    expect(ESIGN_NOTE).toMatch(/no legal validity is claimed/);
  });
});

describe("D5 signing order", () => {
  const c = buildDemoCompany(2026);
  const d = esignDocs(c).find((x) => x.id === "revision:rev-002")!;
  it("a mark out of turn does not count", () => {
    const only = { ...d, seeded: [] };
    const p = esignProgress(only, [mark(only, 2)]);
    expect(p.signed).toBe(0);
    expect(p.next?.order).toBe(1);
  });
  it("in turn: awaiting, then signed", () => {
    expect(esignProgress(d).word).toBe("Awaiting signature");
    expect(esignProgress(d).next?.order).toBe(2);
    const p = esignProgress(d, [mark(d, 2)]);
    expect(p.word).toBe("Signed");
    expect(p.next).toBeNull();
    expect(p.signed).toBe(2);
  });
  it("a second mark for the same line is ignored", () => {
    const p = esignProgress(d, [mark(d, 2), mark(d, 2, "declined")]);
    expect(p.word).toBe("Signed");
  });
  it("a refusal stops the document", () => {
    const p = esignProgress(d, [mark(d, 2, "declined")]);
    expect(p.word).toBe("Declined");
    expect(p.next).toBeNull();
  });
});

describe("D5 registration and the joining pack", () => {
  const c = buildDemoCompany(2026);
  it("a new hire gets a profile with a .test email and consent", () => {
    const p = signingProfile(hire);
    expect(p.email).toBe("noor.al.hashimi@zarqan-demo.test");
    expect(p.consent).toBe(ESIGN_CONSENT);
    expect(p.consentOn.display).toBe("27 October");
    expect(p.display.source).toBe("Registered when HR added the record");
    expect(["Script", "Slanted script", "Upright script"])
      .toContain(p.style);
  });
  it("the pack has the seven papers, all awaiting the new person", () => {
    const { pack, docs } = joiningPack(c, hire);
    expect(pack.docIds).toHaveLength(7);
    expect(docs.map((d) => d.kind)).toEqual([...PACK_KINDS]);
    for (const d of docs) {
      expect(d.packKey).toBe("hire-new-1");
      expect(esignProgress(d).word).toBe("Awaiting signature");
    }
    const offer = docs[0]!;
    expect(offer.signers[0]!.party).toBe("company");
    expect(docs[1]!.signers.map((s) => s.personId)[0]).toBe("hire-new-1");
  });
  it("an accepted offer reuses its offer letter in the pack", () => {
    const { packs } = esignPacks(c);
    const fromOffer = packs.find((p) => p.key.startsWith("offer-"))!;
    expect(fromOffer.docIds[0]).toBe(`offer:${fromOffer.key}`);
    expect(fromOffer.docIds).toHaveLength(7);
    const docs = esignDocs(c);
    for (const id of fromOffer.docIds) {
      expect(docs.some((d) => d.id === id)).toBe(true);
    }
  });
  it("a recent joiner's pack is partly signed (5 of 7)", () => {
    const docs = esignDocs(c);
    const staff = esignPacks(c).packs.find((p) => p.key.startsWith("emp-"))!;
    const done = staff.docIds.filter((id) => esignProgress(
      docs.find((d) => d.id === id)!).word === "Signed").length;
    expect(done).toBe(5);
  });
  it("profiles: staff and the accepted offer, one each", () => {
    const ps = signingProfiles(c);
    expect(new Set(ps.map((p) => p.key)).size).toBe(ps.length);
    expect(ps.some((p) => p.source === "offer")).toBe(true);
    expect(ps.some((p) => p.display.source ===
      "Registered when the system started")).toBe(true);
  });
});
