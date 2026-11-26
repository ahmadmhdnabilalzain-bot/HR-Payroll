/**
 * What a person does on the Access, Connections and Data screens in
 * the demo. It lives in the one demo store (demo/state.tsx) and is
 * lost on reload, like everything else. Each entry names who did it,
 * in which role, and on which demo date.
 */
export interface Stamp {
  by: string;
  role: string;
  on: string;
}

export interface AccessSlice {
  /** User id to who kept their access during the review. */
  accessKept: Record<string, Stamp>;
  /** The review signed off in the demo, if it has been. */
  accessSignoff: Stamp | null;
  /** API key id to who revoked it. */
  keysRevoked: Record<string, Stamp>;
  /** Webhook delivery id to who sent it again. */
  hooksResent: Record<string, Stamp>;
}

export type AccessAction =
  | { type: "access-keep"; ids: string[]; stamp: Stamp }
  | { type: "access-unkeep"; ids: string[] }
  | { type: "access-signoff"; stamp: Stamp }
  | { type: "access-unsign" }
  | { type: "key-revoke"; id: string; stamp: Stamp }
  | { type: "key-restore"; id: string }
  | { type: "hook-resend"; id: string; stamp: Stamp }
  | { type: "hook-unresend"; id: string };

export const ACCESS_INITIAL: AccessSlice = { accessKept: {},
  accessSignoff: null, keysRevoked: {}, hooksResent: {} };

function without<T>(r: Record<string, T>, ...ids: string[])
  : Record<string, T> {
  return Object.fromEntries(Object.entries(r).filter(([k]) =>
    !ids.includes(k)));
}

export function reduceAccess<S extends AccessSlice>(s: S,
  a: AccessAction): S {
  switch (a.type) {
    case "access-keep":
      return { ...s, accessKept: { ...s.accessKept,
        ...Object.fromEntries(a.ids.map((id) => [id, a.stamp])) } };
    case "access-unkeep":
      return { ...s, accessKept: without(s.accessKept, ...a.ids),
        accessSignoff: null };
    case "access-signoff": return { ...s, accessSignoff: a.stamp };
    case "access-unsign": return { ...s, accessSignoff: null };
    case "key-revoke":
      return { ...s, keysRevoked: { ...s.keysRevoked, [a.id]: a.stamp } };
    case "key-restore":
      return { ...s, keysRevoked: without(s.keysRevoked, a.id) };
    case "hook-resend":
      return { ...s, hooksResent: { ...s.hooksResent, [a.id]: a.stamp } };
    case "hook-unresend":
      return { ...s, hooksResent: without(s.hooksResent, a.id) };
  }
}
