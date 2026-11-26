import type { Fils } from "@payroll/engine";
import { Money } from "./Money";

/** A large amount: Money crossfades it, no digit count-up. */
export function RollDigits(p: { value: Fils; size?: "hero" | "lg" | "md" }) {
  return <Money value={p.value} size={p.size ?? "lg"} />;
}
