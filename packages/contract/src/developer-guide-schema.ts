import { z } from "zod";
import { ApiScope } from "./api-keys";

export const GuideExample = z.object({ label: z.string(),
  language: z.enum(["shell", "javascript"]), code: z.string() });

export const DeveloperGuide = z.object({
  baseUrl: z.string(),
  sections: z.array(z.object({
    id: z.enum(["auth", "scopes", "rate-limits", "errors", "webhooks",
      "examples"]),
    title: z.string(), paragraphs: z.array(z.string()),
    examples: z.array(GuideExample) })),
  scopes: z.array(z.object({ scope: ApiScope, routes: z.array(z.object({
    id: z.string(), method: z.string(), path: z.string() })) })),
  webhookEvents: z.array(z.string()),
});
export type DeveloperGuide = z.infer<typeof DeveloperGuide>;
