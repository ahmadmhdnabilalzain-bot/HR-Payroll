import type { Config } from "../config";
import { notConfiguredPorts } from "./not-configured";
import type { ChannelPorts } from "./ports";

/**
 * The production ports: everything off, then each adapter whose
 * environment group is complete swapped in. Called only by main.ts.
 */
export function buildChannelPorts(cfg: Config): ChannelPorts {
  return notConfiguredPorts({ publicApiBaseUrl: cfg.publicApiBaseUrl,
    publicAppBaseUrl: cfg.publicAppBaseUrl });
}
