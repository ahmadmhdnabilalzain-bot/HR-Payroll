import type { DemoData } from "./types";

/**
 * The one place the demo data comes from. Loaded as its own chunk so
 * the engine's rule packs stay out of the entry chunk
 * (tests/unit/bundle.test.ts). When `@payroll/demo-data` lands, this
 * import switches to an adapter over the package (TEMP: stub).
 */
export async function loadDemoData(): Promise<DemoData> {
  const m = await import("./stub");
  return m.stub;
}
