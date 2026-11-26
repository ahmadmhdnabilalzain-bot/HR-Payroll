import { afterAll, describe } from "vitest";
import type { Db } from "../src/db/db";
import { MIGRATIONS_DIR, migrate } from "../src/db/migrate";
import { openPg } from "../src/db/pg";
import { tenancyCases } from "./helpers/tenancy-cases";

const url = process.env.DATABASE_URL;
const opened: Db[] = [];
let n = 0;

/** A fresh schema per case, selected through the search_path. */
async function freshPg(): Promise<Db> {
  const admin = await openPg(url!);
  const schema = `t_${process.pid}_${n++}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  await admin.query(`GRANT USAGE ON SCHEMA ${schema} TO PUBLIC`);
  await admin.close();
  const sep = url!.includes("?") ? "&" : "?";
  const db = await openPg(
    `${url}${sep}options=${encodeURIComponent(`-csearch_path=${schema}`)}`);
  await migrate(db, MIGRATIONS_DIR);
  opened.push(db);
  return db;
}

describe.skipIf(!url)("tenancy (real PostgreSQL)", () => {
  afterAll(async () => {
    for (const db of opened) await db.close();
  });
  tenancyCases(freshPg);
});
