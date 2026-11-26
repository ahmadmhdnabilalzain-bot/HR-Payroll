import { z } from "zod";
import { Id, Timestamp } from "./primitives";

/** Plan 7 uploads: 10 MiB of decoded bytes at most. */
export const MAX_UPLOAD_BYTES = 10_485_760;
/** Request body limit of `POST /v1/files`: base64 of the maximum + JSON. */
export const FILE_BODY_LIMIT = 14_200_000;

/** PDF, PNG and JPEG only, decided from the bytes, never the name. */
export const AllowedMime = z.enum(["application/pdf", "image/png",
  "image/jpeg"]);
export type AllowedMime = z.infer<typeof AllowedMime>;

export const FileUpload = z.object({
  name: z.string().min(1).max(200),
  /**
   * Standard base64 of the file. Long enough for one byte over the
   * maximum, so the server answers FILE_TOO_LARGE rather than a
   * validation error.
   */
  contentBase64: z.string().max(14_000_000),
});
export type FileUpload = z.infer<typeof FileUpload>;

export const FileRef = z.object({
  id: Id,
  name: z.string().min(1).max(200),
  mime: AllowedMime,
  size: z.number().int().min(1).max(MAX_UPLOAD_BYTES),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  uploadedAt: Timestamp,
});
export type FileRef = z.infer<typeof FileRef>;

/**
 * A download body: raw bytes with their stored type. The schema only
 * names it; clients read the bytes, not JSON.
 */
export const FileContent = z.string().describe("raw file bytes");
