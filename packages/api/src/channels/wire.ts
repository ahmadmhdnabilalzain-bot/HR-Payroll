import type { Config } from "../config";
import { nodeResolveHost } from "./dns";
import { nodeHttpClient } from "./http-node";
import { metaWhatsAppSender } from "./meta-whatsapp";
import { notConfiguredPorts } from "./not-configured";
import type { ChannelPorts } from "./ports";
import { postmarkEmailSender } from "./postmark-email";
import { metaWhatsAppInbound } from "../whatsapp/meta-inbound";
import { postmarkInbound } from "../inbound/postmark-inbound";

/**
 * The production ports: everything off, then each adapter whose
 * environment group is complete swapped in. Called only by main.ts.
 */
export function buildChannelPorts(cfg: Config): ChannelPorts {
  const http = nodeHttpClient();
  const p = { ...notConfiguredPorts({
    publicApiBaseUrl: cfg.publicApiBaseUrl,
    publicAppBaseUrl: cfg.publicAppBaseUrl }), http,
  resolveHost: nodeResolveHost };
  const ch = cfg.channels;
  if (ch.email !== null) p.email = postmarkEmailSender(http, ch.email);
  if (ch.whatsapp !== null) {
    p.whatsapp = metaWhatsAppSender(http, ch.whatsapp);
    p.whatsappInbound = metaWhatsAppInbound(ch.whatsapp);
  }
  if (ch.inbound !== null) {
    p.inboundEmail = postmarkInbound(ch.inbound);
    p.inboundEmailDomain = ch.inbound.domain;
  }
  return p;
}
