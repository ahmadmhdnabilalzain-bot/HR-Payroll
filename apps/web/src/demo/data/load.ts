import type { DemoSource } from "./types";

/**
 * The one place the demo data comes from. The package runs the engine
 * (gratuity included), so it loads as its own chunk and the entry
 * chunk stays free of rule-pack code (tests/unit/bundle.test.ts).
 */
export async function loadDemoSource(): Promise<DemoSource> {
  const m = await import("./adapter");
  return m.buildDemoSource();
}
