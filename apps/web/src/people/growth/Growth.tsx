import type { ViewProps } from "../../views";
import { Outside, useAllowed } from "../team/common";

export function Growth(_p: ViewProps) {
  const allowed = useAllowed();
  return allowed ? <Outside /> : <Outside />;
}
