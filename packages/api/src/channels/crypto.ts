import type { Db } from "../db/db";
import type { HandlerDeps } from "../deps";
import { ApiError } from "../http/errors";

/**
 * One company's field crypto for Plan 13 tables. AAD is
 * `<company>:<table>:<column>:<row>`, so a value cannot move to
 * another row, column, table or company.
 */
export interface ChannelSealer {
  seal(table: string, column: string, rowId: string, plain: string)
    : string;
  open(table: string, column: string, rowId: string, cipher: string)
    : string;
}

export async function channelSealer(tx: Db, deps: HandlerDeps,
  companyId: string): Promise<ChannelSealer> {
  const [c] = await tx.query<{ dek_wrapped: string }>(
    "SELECT dek_wrapped FROM companies WHERE id = $1", [companyId]);
  if (c === undefined) throw new ApiError("NOT_FOUND");
  const key = deps.keyring.companyKey(c.dek_wrapped, companyId);
  const aad = (t: string, col: string, id: string) =>
    `${companyId}:${t}:${col}:${id}`;
  return {
    seal: (t, col, id, plain) => key.encrypt(aad(t, col, id), plain),
    open: (t, col, id, cipher) => key.decrypt(aad(t, col, id), cipher),
  };
}
