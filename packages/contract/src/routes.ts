import type { RouteDef } from "./route-def";
import { ACCOUNT_ROUTES } from "./routes-account";
import { DOCUMENT_ROUTES } from "./routes-documents";
import { HR_ROUTES } from "./routes-hr";
import { EXPENSE_ROUTES } from "./routes-expenses";
import { PAY_ROUTES } from "./routes-pay";
import { PEOPLE_ROUTES } from "./routes-people";
import { TIME_ROUTES } from "./routes-time";

export type { Auth, Method, RouteDef } from "./route-def";
export { DOCUMENT_ROUTES };

/** Plan 3's routes. */
export const CORE_ROUTES: readonly RouteDef[] = [
  ...ACCOUNT_ROUTES,
  ...PEOPLE_ROUTES,
  ...TIME_ROUTES,
  ...PAY_ROUTES,
  ...EXPENSE_ROUTES,
];

export { HR_ROUTES };

/** Every HTTP route of the API. The server registers exactly these. */
export const ROUTES: readonly RouteDef[] = [...CORE_ROUTES, ...HR_ROUTES,
  ...DOCUMENT_ROUTES];

export function routeById(id: string): RouteDef {
  const r = ROUTES.find((x) => x.id === id);
  if (r === undefined) throw new Error(`unknown route id ${id}`);
  return r;
}
