import type { AppDeps } from "../deps";
import { register, type App } from "../http/context";
import {
  createOffer,
  decideOffer,
  getOffer,
  listOffers,
  recordResponse,
  withdrawOffer,
} from "../hiring/offers";

export function registerOfferRoutes(app: App, deps: AppDeps): void {
  register(app, deps, "createOffer", createOffer);
  register(app, deps, "listOffers", listOffers);
  register(app, deps, "getOffer", getOffer);
  register(app, deps, "decideOffer", decideOffer);
  register(app, deps, "recordOfferResponse", recordResponse);
  register(app, deps, "withdrawOffer", withdrawOffer);
}
