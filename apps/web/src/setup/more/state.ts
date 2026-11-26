/**
 * Choices made on the connection pages during the demo (WP19). They
 * live in the one demo store (demo/state.tsx), are lost on reload, and
 * record who chose, in which role and on which demo day. Each can be
 * undone. Nothing is connected: a choice only changes what the page
 * shows.
 */
export interface ConnectEdit {
  id: number;
  /** "wa:switch", "cal:leave" ... the page's own setting key. */
  key: string;
  value: string;
  what: string;
  who: string;
  role: string;
  /** ISO day of the demo. */
  on: string;
  undone: boolean;
}

export interface ConnectSlice {
  connectEdits: ConnectEdit[];
  nextConnect: number;
}

export type ConnectAction =
  | { type: "connect-edit"; edit: Omit<ConnectEdit, "id" | "undone"> }
  | { type: "connect-undo"; id: number };

export const CONNECT_INITIAL: ConnectSlice = { connectEdits: [],
  nextConnect: 1 };

export function reduceConnect<S extends ConnectSlice>(s: S,
  a: ConnectAction): S {
  switch (a.type) {
    case "connect-edit": {
      const item: ConnectEdit = { ...a.edit, id: s.nextConnect,
        undone: false };
      return { ...s, connectEdits: [item, ...s.connectEdits],
        nextConnect: s.nextConnect + 1 };
    }
    case "connect-undo":
      return { ...s, connectEdits: s.connectEdits.map((e) =>
        e.id === a.id ? { ...e, undone: true } : e) };
  }
}

/** The current choice for a key, or null (the page's own default). */
export function connectChoice(edits: readonly ConnectEdit[], key: string)
  : ConnectEdit | null {
  return edits.find((e) => e.key === key && !e.undone) ?? null;
}
