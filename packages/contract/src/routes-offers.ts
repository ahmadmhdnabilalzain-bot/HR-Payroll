import { Decision } from "./hiring";
import { Offer, OfferCreate, OfferList, OfferResponse } from "./offers";
import { IdParams } from "./primitives";
import {
  DECIDERS,
  OWNER,
  PAYROLL,
  ten,
  type RouteDef,
} from "./route-def";

const one = { params: IdParams };

/** Plan 8 Task 4: offers with approval (owner, MFA). */
export const OFFER_ROUTES: readonly RouteDef[] = [
  ten(PAYROLL, { id: "createOffer", method: "POST", path: "/v1/offers",
    body: OfferCreate, response: Offer, status: 201 }),
  ten(DECIDERS, { id: "listOffers", method: "GET", path: "/v1/offers",
    response: OfferList }),
  ten(DECIDERS, { id: "getOffer", method: "GET", path: "/v1/offers/{id}",
    ...one, response: Offer }),
  ten(OWNER, { id: "decideOffer", method: "POST",
    path: "/v1/offers/{id}/decision", ...one, body: Decision,
    response: Offer, mfa: true }),
  ten(PAYROLL, { id: "recordOfferResponse", method: "POST",
    path: "/v1/offers/{id}/response", ...one, body: OfferResponse,
    response: Offer }),
  ten(PAYROLL, { id: "withdrawOffer", method: "POST",
    path: "/v1/offers/{id}/withdraw", ...one, response: Offer }),
];
