import type { ViewProps } from "../../views";
import { Outside } from "../team/common";
import { Documents } from "./Documents";
import { Signatures } from "./Signatures";

/**
 * `#/people/files/<screen>`: e-signatures (P35) and documents with
 * versions (P41). Who may open each is the registry's `roles` (the
 * shell's route guard).
 */
export function Files(p: ViewProps) {
  const [screen, ...rest] = p.rest;
  if (screen === "signatures") return <Signatures rest={rest} />;
  if (screen === "documents") return <Documents rest={rest} />;
  return <Outside />;
}
