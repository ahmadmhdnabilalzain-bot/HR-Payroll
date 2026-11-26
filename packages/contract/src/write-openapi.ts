/** I/O shell: writes `dist/openapi.json`. Not exported by the barrel. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildOpenApi } from "./openapi";

const dist = join(import.meta.dirname, "..", "dist");
mkdirSync(dist, { recursive: true });
const file = join(dist, "openapi.json");
writeFileSync(file, `${JSON.stringify(buildOpenApi(), null, 2)}\n`);
console.log(`wrote ${file}`);
