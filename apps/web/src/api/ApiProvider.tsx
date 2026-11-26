import { createContext, useContext, type ReactNode } from "react";
import type { ApiClient } from "./client";

const ApiContext = createContext<ApiClient | null>(null);

export function ApiProvider(p: { api: ApiClient; children: ReactNode }) {
  return <ApiContext.Provider value={p.api}>{p.children}</ApiContext.Provider>;
}

/** The ApiClient chosen in main.tsx (mock or HTTP). */
export function useApi(): ApiClient {
  const api = useContext(ApiContext);
  if (api === null) throw new Error("useApi outside ApiProvider");
  return api;
}
