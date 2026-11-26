import { z } from "zod";

/** RFC 9562 uuid (version and variant bits checked). */
export const Id = z.uuid();
/** A real calendar date, `YYYY-MM-DD`. */
export const IsoDate = z.iso.date();
/** ISO 8601 UTC timestamp ending in `Z`. */
export const Timestamp = z.iso.datetime();
/** AED on the wire: two decimals, never negative, never a float. */
export const Money = z.string().regex(/^\d{1,9}\.\d{2}$/);
/** Labour person id (WPS), 14 digits zero-padded. */
export const PersonId = z.string().regex(/^\d{14}$/);
/** Bank routing code (WPS), 9 digits. */
export const RoutingCode = z.string().regex(/^\d{9}$/);
export const Iban = z.string().regex(/^AE\d{21}$/);
/** Employer id (WPS), 13 digits zero-padded. */
export const EmployerId = z.string().regex(/^\d{13}$/);
export const Lang = z.enum(["en", "ar"]);
export const Period = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});
export const Email = z.email().max(254);
export const Name = z.string().trim().min(1).max(200);

/** Every list response: `{ items }`, so fields can be added later. */
export function listOf<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item) });
}

export const IdParams = z.object({ id: Id });
export const Health = z.object({ status: z.literal("ok") });
/** Body of a 204 response (there is none). */
export const NoContent = z.null();

export type Money = z.infer<typeof Money>;
export type Period = z.infer<typeof Period>;
