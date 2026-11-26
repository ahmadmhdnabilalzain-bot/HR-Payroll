import type { RouteDef } from "./route-def";
import { ACCOUNT_ROUTES } from "./routes-account";
import { PAY_ROUTES } from "./routes-pay";
import { PEOPLE_ROUTES } from "./routes-people";
import { TIME_ROUTES } from "./routes-time";

export type { Auth, Method, RouteDef } from "./route-def";

/** Every HTTP route of the API. The server registers exactly these. */
export const ROUTES: readonly RouteDef[] = [
  ...ACCOUNT_ROUTES,
  ...PEOPLE_ROUTES,
  ...TIME_ROUTES,
  ...PAY_ROUTES,
];

export function routeById(id: string): RouteDef {
  const r = ROUTES.find((x) => x.id === id);
  if (r === undefined) throw new Error(`unknown route id ${id}`);
  return r;
}
