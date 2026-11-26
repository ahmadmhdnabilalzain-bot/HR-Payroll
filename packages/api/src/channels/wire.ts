import type { Config } from "../config";
import { nodeResolveHost, nodeResolveTxt } from "./dns";
import { nodeHttpClient } from "./http-node";
import { metaWhatsAppSender } from "./meta-whatsapp";
import { notConfiguredPorts } from "./not-configured";
import type { ChannelPorts } from "./ports";
import { postmarkEmailSender } from "./postmark-email";
import { metaWhatsAppInbound } from "../whatsapp/meta-inbound";
import { postmarkInbound } from "../inbound/postmark-inbound";
import { httpOidcClient } from "../sso/oidc-http";

/**
 * The production ports: everything off, then each adapter whose
 * environment group is complete swapped in. Called only by main.ts.
 */
export function buildChannelPorts(cfg: Config): ChannelPorts {
  const http = nodeHttpClient();
  const p = { ...notConfiguredPorts({
    publicApiBaseUrl: cfg.publicApiBaseUrl,
    publicAppBaseUrl: cfg.publicAppBaseUrl }), http,
  resolveHost: nodeResolveHost, resolveTxt: nodeResolveTxt };
  const ch = cfg.channels;
  if (ch.email !== null) p.email = postmarkEmailSender(http, ch.email);
  if (ch.whatsapp !== null) {
    p.whatsapp = metaWhatsAppSender(http, ch.whatsapp);
    p.whatsappInbound = metaWhatsAppInbound(ch.whatsapp);
  }
  if (ch.google !== null || ch.microsoft !== null) {
    p.oidc = httpOidcClient(http, {
      ...(ch.google === null ? {} : { google: ch.google }),
      ...(ch.microsoft === null ? {} : { microsoft: ch.microsoft }) });
  }
  if (ch.inbound !== null) {
    p.inboundEmail = postmarkInbound(ch.inbound);
    p.inboundEmailDomain = ch.inbound.domain;
  }
  return p;
}
