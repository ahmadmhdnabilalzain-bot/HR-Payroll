import { EngineError } from "./errors";
import type { RuleSource } from "./rules/types";

const LAW_URL = "https://uaelegislation.gov.ae/en/legislations/1541";

const UAE_GOV_BASE = "https://u.ae/en/information-and-services/jobs/" +
  "Sector-of-employment/employment-in-the-private-sector/";

export const SOURCES: Record<string, RuleSource> = {
  LAW_33_2021: {
    url: LAW_URL,
    note: "Federal Decree-Law 33 of 2021, Articles 29 and 51",
  },
  UAE_GOV_EOSB: {
    url: UAE_GOV_BASE + "end-of-service-benefits-for-employees-in-" +
      "the-private-sector",
    note: "u.ae end-of-service gratuity page",
  },
  UAE_GOV_LEAVES: {
    url: UAE_GOV_BASE + "Types-of-leaves",
    note: "u.ae types-of-leaves page",
  },
  ARABIAN_BUSINESS_EOSB: {
    url: "https://www.arabianbusiness.com/business/" +
      "uae-gratuity-rules-how-to-calculate-end-of-service-pay",
    note: "Secondary press summary of a MOHRE post",
  },
  X0PA_EOSB_CALC: {
    url: "https://x0pa.com/calculators/end-of-service-gratuity/",
    note: "Secondary vendor calculator",
  },
  ENGINE_CONVENTION: {
    url: "",
    note: "engine convention, not law",
  },
  HYPOTHETICAL: {
    url: "",
    note: "hypothetical change, not law",
  },
};

export function sourceOf(id: string): RuleSource {
  const source = Object.hasOwn(SOURCES, id) ? SOURCES[id] : undefined;
  if (source === undefined) {
    throw new EngineError("UNKNOWN_SOURCE", `Unknown source id: ${id}`, {
      id,
    });
  }
  return source;
}
