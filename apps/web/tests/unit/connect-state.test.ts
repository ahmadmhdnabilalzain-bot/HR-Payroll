import { describe, expect, it } from "vitest";
import {
  CONNECT_INITIAL,
  connectChoice,
  reduceConnect,
} from "../../src/setup/more/state";

const edit = (key: string, value: string) => ({ key, value,
  what: `${key} set to ${value}`, who: "Rana Haddad", role: "IT manager",
  on: "2026-10-27" });

describe("connection choices", () => {
  it("records who, role and day, newest first, and undoes", () => {
    let s = reduceConnect(CONNECT_INITIAL,
      { type: "connect-edit", edit: edit("wa:switch", "On") });
    s = reduceConnect(s, { type: "connect-edit",
      edit: edit("wa:switch", "Off") });
    expect(s.connectEdits.map((e) => e.id)).toEqual([2, 1]);
    expect(connectChoice(s.connectEdits, "wa:switch")?.value).toBe("Off");
    s = reduceConnect(s, { type: "connect-undo", id: 2 });
    expect(connectChoice(s.connectEdits, "wa:switch")?.value).toBe("On");
    expect(s.connectEdits[0]).toMatchObject({ who: "Rana Haddad",
      role: "IT manager", on: "2026-10-27", undone: true });
  });

  it("starts with nothing chosen", () => {
    expect(connectChoice(CONNECT_INITIAL.connectEdits, "x")).toBeNull();
  });
});
