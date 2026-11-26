import { z } from "zod";

/** The served OpenAPI document (an object; its shape is OpenAPI's). */
export const OpenApiJson = z.record(z.string(), z.unknown());
