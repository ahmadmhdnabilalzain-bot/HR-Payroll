import type { Res } from "./test-app";

/** Calls one route by id (the conformance recorder). */
type Hitter = (id: string, token: string | null, company: string | null,
  params?: Record<string, string>, body?: unknown,
  extra?: { query?: string; headers?: Record<string, string> })
  => Promise<Res>;

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  4, 2]).toString("base64");
const Q = "?from=2026-01-01&to=2026-12-31";

async function policy(hit: Hitter, owner: string, c: string) {
  const cat = await hit("createExpenseCategory", owner, c, {}, {
    code: "meals", name: "Meals", kind: "receipt" });
  await hit("updateExpenseCategory", owner, c, { id: cat.body.id },
    { nameAr: null });
  await hit("listExpenseCategories", owner, c);
  await hit("putExpensePolicy", owner, c, {}, { claimWindowDays: null,
    limits: [], mileageRates: [], perDiemRates: [], expectedVersion: 0 });
  await hit("getExpensePolicy", owner, c);
  await hit("listApprovalChains", owner, c);
  await hit("putApprovalChain", owner, c, { subjectType: "expense-claim" },
    { tiers: [{ approver: { kind: "line-manager" }, minTotal: "0.00" }],
      overLimitApprover: "owner", expectedVersion: 0 });
  return cat.body.id as string;
}

const item = (cat: string, receiptIds: string[] = []) => ({
  kind: "receipt", categoryId: cat, date: "2026-02-10",
  description: "Lunch", receiptIds, amount: "42.00", vatAmount: "2.00",
  supplierName: "Cafe", supplierTrn: "100000000000003" });

async function claim(hit: Hitter, emp: string, c: string, cat: string,
  receipts: string[] = []) {
  const r = await hit("createExpenseClaim", emp, c, {},
    { title: "Lunch", items: [item(cat, receipts)] });
  return (await hit("submitExpenseClaim", emp, c, { id: r.body.id }))
    .body;
}

/**
 * Plan 6's happy paths before the pay run: receipts, policy, claims
 * and the three decisions. One claim stays approved for the run.
 */
export async function expensesFlow(hit: Hitter, owner: string,
  emp: string, c: string): Promise<void> {
  const cat = await policy(hit, owner, c);
  const up = await hit("uploadReceipt", emp, c, {}, { fileName: "r.png",
    contentType: "image/png", dataBase64: PNG });
  await hit("getReceipt", emp, c, { id: up.body.id });
  await hit("downloadReceipt", emp, c, { id: up.body.id });
  const draft = await hit("createExpenseClaim", emp, c, {},
    { title: "Draft", items: [] });
  await hit("updateExpenseClaim", emp, c, { id: draft.body.id },
    { title: "Draft 2" });
  await hit("cancelExpenseClaim", emp, c, { id: draft.body.id }, {});
  const a = await claim(hit, emp, c, cat, [up.body.id]);
  await hit("approvalInbox", owner, c);
  await hit("approveStep", owner, c, { id: a.approval.id },
    { stepOrder: 1 });
  const b = await claim(hit, emp, c, cat);
  await hit("rejectStep", owner, c, { id: b.approval.id },
    { stepOrder: 1, note: "no receipt" });
  const d = await claim(hit, emp, c, cat);
  await hit("returnStep", owner, c, { id: d.approval.id },
    { stepOrder: 1, note: "split it" });
  await hit("listExpenseClaims", emp, c);
  await hit("getExpenseClaim", emp, c, { id: a.id });
  await hit("expenseAging", owner, c);
  await hit("expenseUnpaid", owner, c);
}

/** The reports (JSON and CSV) once a run pays the approved claim. */
export async function expenseReports(hit: Hitter, owner: string,
  c: string, runId: string): Promise<Res[]> {
  const csv: Res[] = [];
  const both = async (id: string, query: string) => {
    await hit(id, owner, c, {}, undefined, { query });
    csv.push(await hit(id, owner, c, {}, undefined,
      { query: `${query}&format=csv` }));
  };
  await both("expenseSummary", `${Q}&groupBy=category`);
  await both("expenseVatRegister", Q);
  await both("expensePayouts", `?payRunId=${runId}`);
  return csv;
}
