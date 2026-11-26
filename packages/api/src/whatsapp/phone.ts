import { createHmac } from "node:crypto";
import type { Keyring } from "../crypto/keyring";

/**
 * A keyed fingerprint of a phone number, the same in every company
 * (so STOP withdraws everywhere) and useless without the master key.
 */
export function phoneHash(keyring: Keyring, e164: string): string {
  return createHmac("sha256", keyring.derive("payroll/phone-hash/v1"))
    .update(e164, "utf8").digest("hex");
}

export const PHONE_TABLE = "channel_opt_ins";
