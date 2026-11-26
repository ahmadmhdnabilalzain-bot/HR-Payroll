import type { AuthSource } from "./client";

export interface AuthStore extends AuthSource {
  set(token: string, companyId: string | null): void;
  clear(): void;
}

/** An in-memory AuthSource; the session layer can wrap storage on it. */
export function memoryAuth(): AuthStore {
  let token: string | null = null;
  let companyId: string | null = null;
  return {
    token: () => token,
    companyId: () => companyId,
    set: (t, c) => {
      token = t;
      companyId = c;
    },
    clear: () => {
      token = null;
      companyId = null;
    },
  };
}
