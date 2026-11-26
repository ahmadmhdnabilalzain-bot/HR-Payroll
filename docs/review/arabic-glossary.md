# Arabic glossary: proposed, for native review

> **NEEDS NATIVE REVIEW.** The Arabic below is what the repo uses today
> (written by Claude, never read by a native speaker) plus suggestions to
> verify. Nothing here is authoritative or a translation ruling. Row ids
> such as `PAY:earn.gross` point to `docs/review/arabic-review-pack.md`.

How to use: for each term, the reviewer picks one Arabic wording and the
team then uses it everywhere. Section 1 lists the terms the code uses
repeatedly. Section 2 lists inconsistencies found (the same English
concept worded two ways, or one Arabic word used for two concepts).
Section 3 lists terms needed soon that the code does not yet contain.
Section 4 lists style decisions that are not words.

## 1. Recurring terms as used in the repo

Format: English / Arabic used / where / suggestion to verify.

### Pay and amounts

- Salary: الراتب, راتب. Used in `PAY:earn.basic`, `PAY:earn.gross`,
  `PAY:pay.net`, `ERR:SALARY_MISSING`. Suggestion to verify: keep راتب for
  labels; official texts may say الأجر; verify.
- Basic salary: الراتب الأساسي (`PAY:earn.basic`, seed component basic).
  Verify against الأجر الأساسي in legal lines.
- Gross pay: إجمالي الراتب (`PAY:earn.gross`).
- Net pay: صافي الراتب (`PAY:pay.net`).
- Allowance: بدل, البدل (`PAY:earn.allowance`); housing: بدل السكن;
  transport: بدل المواصلات (seed components). Possible variants to verify:
  بدل النقل, بدل الانتقال.
- Deduction: خصم, الخصومات, مجموع الخصومات (`PAY:ded.*`, CLI items).
  Possible variant to verify: الاستقطاعات.
- Overtime: العمل الإضافي (`PAY:earn.overtime.normal`); night overtime:
  العمل الإضافي الليلي.
- Pay run: مسير الرواتب (six uses in `ERR:*`). Verify regional usage; other
  regions may say كشف المرتبات.
- Salary file (SIF): ملف الرواتب (`ERR:RUN_NOT_APPROVED`,
  `ERR:SIF_GENERATION_FAILED`). Suggestion to verify: ملف معلومات الراتب.
- WPS: نظام حماية الأجور (`ERR:COMPANY_WPS_SETTINGS_MISSING`). Note it says
  الأجور while the rest of payroll says الرواتب.
- Bank routing code: رمز توجيه البنك.
- Amount shown as `AED 1,234.00` in Latin script inside Arabic text. No
  Arabic currency word is used today.

### Leave and time

- Annual leave: الإجازة السنوية (`SEED:leaveType.Annual leave`).
- Sick leave: الإجازة المرضية.
- Maternity leave: إجازة الوضع (`PAY:leave.maternity`). Verify against
  إجازة الأمومة.
- Unpaid leave: إجازة بدون راتب (seed) and بدون أجر (payslip lines): see
  I-2.
- Rest day: أيام الراحة; official holidays: العطلات الرسمية.
- Probation: فترة التجربة.
- Days in lieu of rest: أيام راحة بديلة.
- Leave balance: رصيد الإجازة (`ERR:INSUFFICIENT_BALANCE`).

### End of service

- Gratuity: مكافأة نهاية الخدمة (`SET:gratuity.total`).
- Tier: الشريحة (`SET:gratuity.tier1`, `SET:gratuity.tier2`).
- Cap: الحد الأقصى (`SET:gratuity.cap`).
- Completed service years: سنوات خدمة مكتملة.
- Notice pay: بدل الإنذار (`SET:settlement.total`, CLI items).
- Other dues: المستحقات الأخرى.
- Leaver (departing employee): الموظف المغادر
  (`ERR:SETTLEMENT_INPUT_REQUIRED`).

### Pension

- Pension contribution: اشتراك المعاش (`PAY:ded.gpssa`,
  `PAY:employer.gpssa`) and bare الاشتراك: see I-4.
- Employee share / employer share: حصة الموظف, حصة صاحب العمل.
- Government support: دعم الحكومة (`PAY:gpssa.employer-gross`).
- UAE nationals: للمواطنين الإماراتيين (as written); pension legislation:
  تشريعات المعاشات (`SET:gratuity.total.not-applicable`).

### People and roles

- Employee: موظف, الموظف; the plural forms are in `WEB:common.employees.*`.
  "This person": هذا الشخص (five errors): see I-10.
- Employer: صاحب العمل; company: الشركة.
- Owner: مالك; member: عضو; role: دور (`ERR:FORBIDDEN`).
- Authenticator app: تطبيق المصادقة (five errors).
- Invite: الدعوة (consistent).

### Status and trust words (appended after payslip and settlement lines)

- official: رسمي; secondary: ثانوي; convention: اختيار النظام;
  hypothetical: افتراضي; unsourced: بلا مصدر; no rules: بلا قواعد;
  overridden: قيمة مستبدلة. Rows `STATUS:*`. All are HIGH: see the pack,
  section 3.1.

### Interface

- Language: اللغة; theme: المظهر; light: فاتح; dark: داكن;
  follow device: حسب الجهاز; sample data: بيانات تجريبية; loading:
  جارٍ التحميل; try again: حاول مرة أخرى; reference: المرجع.

## 2. Inconsistencies found

Each item names the rows. "Decision" is for the native reviewer.

- **I-1 Salary or wage.** Pay lines say الراتب (basic, gross, net) but the
  deduction base and limit say الأجر (`PAY:cap.base`, `PAY:cap.overall`),
  and overtime and rest-day pay say أجر العمل (`PAY:earn.overtime.*`,
  `PAY:earn.rest-day`, `PAY:earn.holiday`). Decision: one word for the
  amount an employee is paid, and which one on legal lines.
- **I-2 Unpaid leave.** بدون أجر six times in payslip lines, but بدون
  راتب once, in the leave type name (`SEED:leaveType.Unpaid leave`).
  Decision: أجر or راتب.
- **I-3 Gratuity.** The full term مكافأة نهاية الخدمة is used in three
  lines. The tier and cap lines use bare المكافأة (`SET:gratuity.tier1`,
  `.tier2`, `.cap`), which can read as a bonus. The not-applicable line
  uses مستحقات نهاية الخدمة and مكافأة قانون العمل in one sentence.
  Decision: one full term, and whether bare المكافأة is acceptable.
- **I-4 Pension.** اشتراك المعاش (deduction and employer lines), bare
  الاشتراك (`PAY:gpssa.salary` راتب حساب الاشتراك, `PAY:gpssa.employee-
  share`, `PAY:gpssa.employer-gross`), المعاش and تشريعات المعاشات
  (`SET:gratuity.total.not-applicable`). The authority is never named in
  Arabic. Decision: one term, and whether to name the authority.
- **I-5 Pay for unused leave.** بدل نقدي عن الإجازة السنوية
  (`PAY:earn.leave-encashment`) and بدل الإجازة غير المستخدمة
  (`SET:leave.pay`) describe the same payment in two ways. Decision: one.
- **I-6 One word, three meanings.** بدل means allowance (`PAY:earn.
  allowance`, seed components), pay in lieu (`SET:leave.pay`, بدل
  الإنذار) and cash for leave (بدل نقدي). Decision: whether to keep بدل
  for all three or separate them.
- **I-7 Totals.** المجموع المحسوب (`SET:settlement.total`), مجموع
  الخصومات (`PAY:ded.total`), إجمالي الراتب (`PAY:earn.gross`) and فوق
  إجمالي الراتب (`PAY:employer.total`). Decision: مجموع or إجمالي.
- **I-8 Demo and sample.** تجريبي (`WEB:common.sampleData`, the company
  name), نموذجي (`CONTRACT:settlement.explanation.ar`), نموذج in the
  company name شركة نموذج, and the plan fixtures use عينة. Decision:
  one word for demo data.
- **I-9 Approve.** The errors use اعتماد and اعتمد (`ERR:SOD_VIOLATION`,
  `ERR:RUN_NOT_APPROVED`); the plans use الموافقة for approvals and for
  consent. The code removed معتمد from payslip text because it reads as
  approved or certified. Decision: one word for approve, a different one
  for consent, and a rule against using either as an adjective on a
  figure.
- **I-10 Employee or person.** الموظف in nouns, but هذا الشخص in five
  errors (`ERR:ALREADY_MEMBER`, `LEAVE_OVERLAP`, `EMPLOYEE_NOT_IN_PERIOD`,
  `ENTERED_AMOUNTS_REQUIRED`, `SALARY_MISSING`). Decision: keep, or use
  الموظف and add a feminine form.
- **I-11 Wages or salaries.** WPS is نظام حماية الأجور (أجور) while the rest
  of the payroll vocabulary is رواتب. Probably correct (official name);
  confirm.
- **I-12 Status words are different parts of speech.** رسمي, ثانوي,
  افتراضي are adjectives; اختيار النظام and قيمة مستبدلة are noun
  phrases; بلا مصدر and بلا قواعد are prepositional. Decision: whether to
  harmonise them.
- **I-13 Tanween placement.** One word puts the tanween mark after the
  alif, قانوناً (`CLI:hypothetical`); fourteen others put it on the
  letter before the alif, such as يومًا and أولًا. Decision: one style.
- **I-14 Commas.** The Arabic comma "،" is used in text and the CLI list
  separator, but `statusList` joins statuses with a Latin ", " (noted in
  LEDGER.md). Decision: use "،" everywhere.
- **I-15 Currency.** The shipped format is `AED 4,000.00`; plan 7 drafts
  `4,000.00 درهم`; plan 17 accepts د.إ. Decision: one spelling and
  position.
- **I-16 Counts with units.** Some lines give a count with a unit
  (`{in.fullPay} أيام`) and the next give a bare number
  (`{in.halfPay} بنصف أجر`). Decision: make units explicit or drop the
  first unit.
- **I-17 Notice.** بدل الإنذار (notice pay) uses إنذار, which also means
  warning. Official text may use إشعار or مهلة الإشعار; verify. Decision: which.
- **I-18 Formal address.** Errors address the user with masculine singular
  imperatives; the review banner uses متحدث أصلي (masculine). Decision:
  keep or neutralise (see pack, section 3.5).

## 3. Terms the code does not contain yet (proposed to add)

Suggestions to verify; all may be rejected.

- Payslip: قسيمة الراتب (plan 13 already drafts قسيمة راتبك); Possible
  alternatives مفردات الراتب, كشف الراتب.
- IBAN: رقم الحساب المصرفي الدولي (آيبان).
- MOHRE: وزارة الموارد البشرية والتوطين; GPSSA: الهيئة العامة للمعاشات
  والتأمينات الاجتماعية.
- Salary advance: سلفة (vs قرض, loan).
- Fine or penalty: غرامة, جزاء (vs مخالفة, violation).
- Damage: ضرر, تلف (vs إتلاف, destruction).
- Court order: أمر قضائي (vs حكم قضائي, court judgment).
- Draft: مسودة (already used); void or cancel: إلغاء.
- Month names: نوفمبر style (Gulf, what `Intl` gives for `ar-AE`).
- Words to ban from product text, as a test already does for English
  (plan 4, plan 7): مطابق, متوافق, معتمد, مصدق, شهادة, ملزم, توقيع,
  وزارة, المادة, قانون, مرسوم. Review the list.

## 4. Style decisions that are not words

- Digits: Western (current) or Eastern Arabic (٠-٩)?
- Decimal and thousands separators: "." and "," (current) or ٫ and ٬?
- Percent: 50%, ٪50 or 50٪?
- Currency: AED, درهم or د.إ, and before or after the number?
- Imperative form: masculine singular (current), or neutral nouns?
- Diacritics: the repo adds them only where needed (tanween as in جارٍ,
  يومًا, أولًا, and a few passives such as تُحفظ). Keep that rule?
- Hamza and ta marbuta spelling follow standard orthography; flag any
  exception.
- Quotation and bracket style around status words: "(رسمي)".
