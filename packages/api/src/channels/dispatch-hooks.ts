import type { Payload } from "./dispatch-record";
import type { DeliveryRowDb } from "./fallback";
import type { EventCtx } from "./notify";

/**
 * Last step before a WhatsApp send (Task 4 adds approval buttons).
 * Email rows pass through unchanged.
 */
export async function prepareWhatsApp(_c: EventCtx, _d: DeliveryRowDb,
  p: Payload, _toE164: string): Promise<Payload> {
  return p;
}
