/**
 * Shell: `pnpm letters:sample` renders every starter letter in both
 * languages with fake data into out/letters/ for a person to look at.
 * Needs CHROME_PATH (CHROME_NO_SANDBOX=1 when running as root).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LetterKind } from "@payroll/contract";
import { parseAed } from "@payroll/engine";
import { chromeRenderer } from "../pdf/chrome-renderer";
import type { LetterPage } from "../pdf/renderer";
import { dejavuBase64 } from "../pdf/setup";
import { mergeTemplate } from "./merge";
import { LETTER_LABELS } from "./prepare";
import { STARTERS_EN } from "./starters";
import { STARTERS_AR } from "./starters-ar";
import { formatMoney } from "./values";

type Lang = "en" | "ar";

function values(lang: Lang): Record<string, string> {
  const money = formatMoney(parseAed("4000.00"), lang);
  return { "company.name": "Sample Trading LLC",
    // NEEDS NATIVE REVIEW: sample data only.
    "company.nameAr": "شركة عينة للتجارة",
    "employee.fullName": lang === "en" ? "Sample Employee" : "عينة موظف",
    "employee.number": "E-0001", "employee.jobTitle": "Clerk",
    "employee.joiningDate": "2019-01-01",
    "employee.lastWorkingDate": "2026-10-31",
    "salary.basic": money, "salary.monthlyTotal": money,
    "letter.date": "2026-11-26", "letter.reference": "SAMPLE-1",
    "input.addressee": "Sample Bank", "input.purpose": "Account opening",
    "input.reason": "Late arrival", "input.incidentDate": "2026-11-20",
    "input.replyTo": "hr@example.com", "input.candidateName": "Sample",
    "input.position": "Clerk", "input.startDate": "2027-01-01",
    "input.offerMonthlyTotal": money };
}

function pageOf(kind: LetterKind, lang: Lang): LetterPage {
  const v = values(lang);
  const set = lang === "en" ? STARTERS_EN : STARTERS_AR;
  const m = mergeTemplate(set[kind].body, v);
  const line = (l: string, x: string) =>
    [{ text: `${l}: `, isolate: false }, { text: x, isolate: true }];
  return { lang, heading: lang === "en" ? v["company.name"]!
    : v["company.nameAr"]!, title: m.title, paragraphs: m.paragraphs,
  dateLine: line(LETTER_LABELS[lang].date, v["letter.date"]!),
  refLine: line(LETTER_LABELS[lang].ref, v["letter.reference"]!),
  issuerLines: ["Sample Issuer"], watermark: null };
}

async function main(): Promise<void> {
  const exe = process.env.CHROME_PATH;
  if (exe === undefined || exe === "") {
    process.stderr.write("CHROME_PATH is required\n");
    process.exit(1);
  }
  const pdf = chromeRenderer({ executablePath: exe,
    noSandbox: process.env.CHROME_NO_SANDBOX === "1",
    fontBase64: dejavuBase64(), timeoutMs: 20_000,
    log: (l) => process.stderr.write(`${JSON.stringify(l)}\n`) });
  const dir = join(process.cwd(), "out", "letters");
  mkdirSync(dir, { recursive: true });
  try {
    for (const lang of ["en", "ar"] as const) {
      for (const kind of LetterKind.options) {
        const file = join(dir, `${kind}-${lang}.pdf`);
        writeFileSync(file, await pdf.render(pageOf(kind, lang)));
        process.stdout.write(`${file}\n`);
      }
    }
  } finally {
    await pdf.close();
  }
}

void main();
