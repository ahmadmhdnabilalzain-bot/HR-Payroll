import { EngineError } from "./errors";
import type { RuleSource } from "./rules/types";

const LAW_URL = "https://uaelegislation.gov.ae/en/legislations/1541";

export const SOURCES: Record<string, RuleSource> = {
  LAW_33_2021: {
    url: LAW_URL,
    note: "Federal Decree-Law 33 of 2021, Articles 29 and 51",
  },
  UAE_GOV_EOSB: {
    url: "https://u.ae/en/information-and-services/jobs/" +
      "end-of-service-gratuity",
    note: "u.ae end-of-service gratuity page",
  },
  UAE_GOV_LEAVES: {
    url: "https://u.ae/en/information-and-services/jobs/" +
      "types-of-leaves",
    note: "u.ae types-of-leaves page",
  },
  ARABIAN_BUSINESS_EOSB: {
    url: "https://www.arabianbusiness.com",
    note: "Secondary press summary of a MOHRE post",
  },
  X0PA_EOSB_CALC: {
    url: "https://x0pa.com",
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
  const source = SOURCES[id];
  if (source === undefined) {
    throw new EngineError("UNKNOWN_SOURCE", `Unknown source id: ${id}`, {
      id,
    });
  }
  return source;
}
