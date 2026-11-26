import type { AuthVerdictT } from "../channels/ports";

export interface AuthFacts {
  spf: AuthVerdictT;
  dkim: AuthVerdictT;
  dmarc: AuthVerdictT;
  /** The domains the SPF and DKIM results were for, when known. */
  spfDomain?: string | null;
  dkimDomain?: string | null;
}

/** `d` is the From domain or one of its subdomains (relaxed alignment). */
function aligned(d: string | null | undefined, from: string): boolean {
  if (d === null || d === undefined || d === "") return false;
  const x = d.toLowerCase();
  return x === from || x.endsWith(`.${from}`);
}

/**
 * Pure. Reject: SPF fail, DMARC fail, or DKIM fail without an SPF pass
 * (the allow-list never overrides a fail). Pass: DMARC pass, or SPF
 * and DKIM both pass with at least one of them for the From domain.
 * Anything else is flagged for review. Stricter than the plan: SPF
 * and DKIM passes for another domain (the attacker's own) only flag.
 */
export function senderAuthDecision(a: AuthFacts, fromDomain: string)
  : "reject" | "flag" | "pass" {
  if (a.spf === "fail" || a.dmarc === "fail") return "reject";
  if (a.dkim === "fail" && a.spf !== "pass") return "reject";
  if (a.dmarc === "pass") return "pass";
  const from = fromDomain.toLowerCase();
  const own = aligned(a.spfDomain, from) || aligned(a.dkimDomain, from);
  return a.spf === "pass" && a.dkim === "pass" && own ? "pass" : "flag";
}
