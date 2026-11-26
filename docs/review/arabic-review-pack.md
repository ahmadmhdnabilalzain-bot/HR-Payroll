# Arabic native-review pack

> **NEEDS NATIVE REVIEW.** Every Arabic string in this product was
> written by Claude and has not been read by a native speaker. No
> employee may see Arabic until a native speaker has signed this pack.
> Nothing in this pack is a translation, a ruling or legal advice.
> Every Arabic term suggested here is a suggestion to verify, never
> authoritative.

Source: branch `claude/quirky-wozniak-b7xkvr` at 47a165f, scanned with
`docs/review/scan-arabic.mjs` (see section 8). Related files:
`docs/review/arabic-glossary.md` and `docs/review/arabic-checks.md`.

## 1. Read this first

### 1.1 Gate finding: nothing blocks an employee from seeing Arabic

The review requirement is not enforced by code today. Checked in this branch:

- `apps/web/src/App.tsx` `LangSwitch` shows an "العربية" button to every user.
  The choice is saved in localStorage (`lib/prefs.ts`) and restored on the next
  visit.
- The only control is a banner (`common.arReviewBanner`, row
  WEB:common.arReviewBanner) shown above the page when Arabic is selected. It
  does not block anything.
- The API returns `explanation.ar` on every computed settlement with the flag
  `arReviewed: false` (`compute-settlement.ts`, `contract/payroll.ts`). Nothing
  in apps/web or packages/api reads the flag to hide the text.
- The engine CLI (`pnpm demo`, `--lang ar`) prints the Arabic with no review
  notice at all.
- Reachable by an employee today: the product name in the header and tab title,
  the language and theme labels, the sample-data badge and hint, the banner, the
  placeholder message, and (through the API) the settlement explanation. The
  payslip catalog, the error catalog, the plural messages and the seed names are
  complete but not yet drawn by any screen; they will be as screens are built.

Suggested follow-ups for the owner (not done here, because this pack adds files
only): hide the Arabic button and `explanation.ar` unless a build or company
setting says the Arabic was signed off; make the flag `arReviewed` a real gate;
and fail a check when the sign-off in section 9 is blank.

### 1.2 How to review

- Work area by area (section 5). Rows are sorted HIGH first.
- In the last column write ACCEPT, or CORRECT with the Arabic you want, or
  REJECT with a reason. A blank means not reviewed.
- Read the Context column: it says where the text appears and carries flags for
  the points below.
- Placeholders in braces, such as {result} or {in.days}, are filled by the
  program with numbers, names, dates or codes. Keep them unchanged.
- Where a term differs between Gulf usage and Modern Standard Arabic (MSA), say
  which you want. Section 4 lists the payroll terms with suggestions to verify.

### 1.3 Risk ratings

- **HIGH**: legal, money or consent wording. A wrong word could state a
  legal conclusion, a wrong amount rule, a deduction basis, an approval
  or consent that did not happen. All payslip and settlement lines are
  HIGH because they print next to an amount.
- **MEDIUM**: labels and messages a user acts on (buttons, errors,
  forms, leave types).
- **LOW**: decorative or technical (theme names, demo person names).

### 1.4 Flags used in the Context column

- `[CLAIM]` could read as approval, compliance, certification, an
  official status or a legal conclusion.
- `[DIGIT]` digits, percent or number formatting choice.
- `[PLURAL]` a fixed plural form next to a variable number, or a plural
  category to verify.
- `[BIDI]` mixed-direction text: Latin, digits, dates or codes inside
  Arabic.
- `[GENDER]` masculine or feminine form chosen for every user.
- `[GULF]` Gulf (UAE) usage may differ from MSA; verify.
- `[TERM]` the same English concept is worded two ways, or the term
  needs checking (see the glossary).
- `[GRAM]` spelling, tanween, diacritics or construction to check.

## 2. Counts

| Area | HIGH | MEDIUM | LOW | Total |
|------|-----:|-------:|----:|------:|
| A. Payslip lines | 28 | 1 | 0 | 29 |
| B. Settlement and gratuity | 10 | 0 | 0 | 10 |
| C. Status, years, CLI labels | 14 | 0 | 4 | 18 |
| D. Web UI strings and name | 1 | 18 | 8 | 27 |
| E. Web error messages | 17 | 35 | 0 | 52 |
| F. Contract example, seed data | 0 | 7 | 27 | 34 |
| G. Planned copy in docs | 19 | 20 | 6 | 45 |
| **All** | **89** | **81** | **45** | **215** |

Units differ, so both are given. A *scanner line* is one source line that holds
Arabic (a long sentence spans several lines). A *row* is one logical string. The
pack lists every row in areas A to G, and the scanner inventory of tests and
docs in Appendix A and B.

| Scanner area | Files | Lines | Arabic runs |
|--------------|------:|------:|------------:|
| contract | 1 | 1 | 1 |
| docs | 10 | 109 | 184 |
| engine-explain | 3 | 74 | 102 |
| tests | 14 | 34 | 33 |
| web-brand | 1 | 1 | 1 |
| web-i18n | 4 | 91 | 106 |
| web-mock-seed | 3 | 26 | 36 |

Run `node docs/review/scan-arabic.mjs --check docs/review/arabic-review-pack.md`
as a drift check: it reports any Arabic run in the repo that is missing from
this pack.

## 3. Concerns that cut across the product

### 3.1 Wording that could read as approval, compliance, certification
### or a legal conclusion

43 rows carry a [CLAIM] flag. The highest-priority groups:

- **"رسمي" after every figure** (STATUS:official). The status word is appended
  to every payslip and settlement line, so each amount ends "(رسمي)". It can
  read as "this figure is official or approved". The English means "the rule
  comes from an official source". The code already avoids "معتمد" (approved,
  certified) and "عرف" (custom, a source of law); confirm the replacements do
  not carry the same reading.
- **Legal limits and permissions**: "الحد القانوني" (leave.sick,
  leave.maternity), "أقصى ما يجوز خصمه" (cap.overall), "حدود الخصم" (cap.base),
  "بموجب حكم قضائي" (ded.court-debt), "خصم بسبب مخالفة" (ded.violation), "نظام
  ادخار" (ded.scheme; "نظام" also means law).
- **Entitlement conclusions**: "غير مستحقة" and "لا تنطبق ... لتشريعات المعاشات،
  لا لمكافأة قانون العمل" (gratuity zero lines) tell the employee they are not
  owed something, citing law.
- **Approval vs certification**: the errors use "اعتماد" for approving a pay run
  or entry (RUN_NOT_APPROVED, SOD_VIOLATION); the plans use "الموافقة" for
  approvals and for consent. "اعتماد" can mean accreditation. Pick one word per
  meaning (glossary I-9).
- **Scope statements**: ENGINE_REFUSED "غير مشمولة بعد" (not covered yet) and
  CLI "افتراضي (ليس قانوناً)" (hypothetical, not law).
- **Consent claims** (planned): WHATSAPP_CONSENT_TEXT, CONSENT_NOTICE.* and
  RECORDING_BANNER "وافق جميع الحاضرين على التسجيل" assert that people agreed.
  These are the legal record of consent: legal review as well as native review.

Rows with a [CLAIM] flag:

  PAY:leave.sick, PAY:leave.maternity, PAY:earn.overtime.night,
  PAY:gpssa.gov-support, PAY:cap.base, PAY:cap.overall, PAY:ded.violation,
  PAY:ded.damage, PAY:ded.court-debt, PAY:ded.scheme,
  SET:gratuity.total.not-eligible, SET:gratuity.total.not-applicable,
  SET:settlement.total, STATUS:official, STATUS:convention,
  STATUS:hypothetical, STATUS:unsourced, STATUS:none, CLI:total,
  CLI:notComputed, CLI:hypothetical, CLI:items.other dues,
  WEB:common.arReviewBanner, ERR:SOD_VIOLATION, ERR:RUN_NOT_APPROVED,
  ERR:ENGINE_REFUSED, SEED:company.nameAr, PLAN13:approval-pending.subject,
  PLAN13:approval-closed.subject, PLAN13:leave-decided.subject,
  PLAN13:security-sso-linked.subject, PLAN13:TEMPLATE_TERMS.outcome.approved,
  PLAN13:TEMPLATE_TERMS.outcome.rejected,
  PLAN13:TEMPLATE_TERMS.outcome.returned, PLAN13:WHATSAPP_CONSENT_TEXT,
  PLAN14:meeting-items-ready.subject, PLAN14:CONSENT_NOTICE.intro,
  PLAN14:CONSENT_NOTICE.purposes.record,
  PLAN14:CONSENT_NOTICE.purposes.summarise, PLAN14:CONSENT_NOTICE.withdraw,
  PLAN14:RECORDING_BANNER, PLAN7:starter-ban-list, PLAN4:wps-ban-list

### 3.2 Digits and number formatting

- Chosen by the code: Western digits (0-9) in both languages, Gregorian calendar
  (`ar-AE-u-ca-gregory-nu-latn` in `i18n/format.ts`; the engine catalog comment
  says "Amounts keep Western digits"). Verify with the reviewer that Western
  digits are what Gulf employees expect on a payslip, or whether Eastern Arabic
  digits (٠-٩) are wanted.
- Input accepts Arabic-Indic digits (٠-٩), Persian digits (۰-۹), the Arabic
  decimal separator ٫ and thousands separator ٬ (`i18n/amount-input.ts`). Only
  input is flexible; output never uses them.
- Money prints as `AED 38,333.33` wrapped in left-to-right isolates (U+2066,
  U+2069) inside Arabic text. The currency is Latin "AED". Options to choose
  between: "AED" (now), "درهم" (plan 7: `4,000.00 درهم`), "د.إ" (plan 17
  parser). Also where the minus sign goes for a negative amount.
- Percent ({in.capPercent} in cap.overall): "50%", "٪50" or "50٪". The text does
  not say.
- Dates: ISO `YYYY-MM-DD` is inserted raw into payslip lines (payroll.period)
  and letters. `Intl` formats long dates as "26 نوفمبر 2026" (the `ar-AE` month
  names; a Levantine style such as كانون/تشرين would differ). Time is 24-hour
  ("13:05").
- Counts below 3 or 11 and 100: see plurals. Zero is written "لا يوجد موظفون" /
  "لا أيام" in the web catalog (no digit).

### 3.3 Plural forms

- The web catalog (`common.employees`, `common.days`) gives all six Arabic
  categories (zero, one, two, few, many, other). `Intl.PluralRules("ar")` picks:
  0 zero; 1 one; 2 two; 3-10 few; 11-99 many; 100, 101, 102 and fractions other;
  103 few again. Rows D list each form: verify each, including "other" for
  100-102 and decimals.
- The engine catalogs do **not** pluralise. They hard-code one form next to a
  variable number: "{y} سنوات و{d} أيام" (YEARS_TEXT), "{in.completedYears}
  سنوات", "{in.unpaidDays} أيام", "{in.days} أيام", "{in.daysOff} أيام",
  "{in.minutes} دقيقة" (singular for all), "{result} يومًا". They are wrong for
  1 and 2, and for 3-10 or 11+ depending on the form. Decide whether to add
  pluralisation or reword to a form that survives any number (for example "عدد
  الأيام: {n}").
- Planned retention text "{days} يومًا" has the same issue.

### 3.4 Mixed-direction text

- Only money is isolated. `LTR_ISOLATE` (U+2066 ... U+2069) wraps the AED
  amount. Everything else is inserted raw: `{in.ref}`, `{in.code}`, ISO dates,
  `22:00 إلى 04:00`, `{in.capPercent}`, `{in.fixingMonth}`, `{requestId}`. Latin
  or digit runs next to Arabic punctuation can reorder.
- The trailing status in parentheses "({rules})" and a final full stop sit at
  the end of each RTL line: confirm the bracket and stop land on the visual
  left.
- `statusList` joins several statuses with a Latin ", " in Arabic (LEDGER.md
  notes this); the CLI list separator is the Arabic comma "،". Inconsistent.
- Unknown trace ids fall back to the English label plus the Latin tag
  "[untranslated]" inside Arabic output (`explain.ts`, `UNTRANSLATED`). An
  employee could see English fragments.
- The terminal (CLI) and plain-text email may not run the bidirectional
  algorithm: check the CLI output in a real terminal.
- Latin brand and protocol words inside Arabic sentences (planned): Meta, STOP,
  WhatsApp, Google, Microsoft.

### 3.5 Gendered forms

- Every instruction is a masculine singular imperative: اختر, سجّل, حاول, أدخل,
  اعتمد, أضف, أبلغ, اطلب, افتح. This is the usual MSA convention for UI; decide
  whether the product wants it, or a neutral form (for example a verbal noun:
  "إعادة المحاولة").
- Predicates that name the user are masculine: "لست عضوًا" (TENANT_FORBIDDEN),
  "غير موظف" (EMPLOYEE_NOT_IN_PERIOD), "عضو" (ALREADY_MEMBER), "مالك"
  (LAST_OWNER), "إن لم تكن أنت" (planned security notice), "متحدث أصلي" in the
  review banner.
- "هذا الشخص" (this person, masculine) stands for any employee in many errors.
- Nouns for people: "موظف" (singular) and "موظفين" (plural) are masculine; no
  feminine form is offered.
- Planned approval outcomes (تمت الموافقة عليها, تم رفضها, أعيدت للتعديل) are
  feminine singular and agree only with feminine subjects (مطالبة, إجازة). A
  masculine subject breaks agreement (PLAN13:TEMPLATE_TERMS).
- The maternity leave line ("إجازة الوضع") concerns women only: check any
  agreement words in it.

### 3.6 Gulf vs MSA

Terms where UAE or Gulf usage may differ from MSA or from Levantine or Egyptian
payroll usage are listed in section 4. Everything is a suggestion to verify.
Where the official Arabic text of the UAE labour law may use a different word
from HR product usage (for example الأجر vs الراتب, العامل vs الموظف, إشعار vs
إنذار), the choice needs the reviewer and, for legal lines, counsel.

## 4. Payroll vocabulary: suggestions to verify

Not authoritative. "Repo" is what the code uses now. "Suggestion" is only a
candidate for the native reviewer to confirm or reject; where a legal source
uses a different word, that is noted.

<table>
<tr>
  <th>Concept</th>
  <th>Repo uses</th>
  <th>Suggestion to verify</th>
  <th>Note</th>
  <th>Reviewer</th>
</tr>
<tr>
<td>
  salary
</td>
<td dir="rtl">
  الراتب / راتب
</td>
<td dir="rtl">
  راتب
</td>
<td>
  Possibly الأجر (wage) in official texts; verify. Pick one for payslip
  labels and keep legal lines consistent.
</td>
<td></td>
</tr>
<tr>
<td>
  basic salary
</td>
<td dir="rtl">
  الراتب الأساسي
</td>
<td dir="rtl">
  الراتب الأساسي
</td>
<td>
  Possibly الأجر الأساسي in official texts; verify.
</td>
<td></td>
</tr>
<tr>
<td>
  allowance
</td>
<td dir="rtl">
  بدل
</td>
<td dir="rtl">
  بدل (pl. بدلات)
</td>
<td>
  بدل also used for pay in lieu; see below.
</td>
<td></td>
</tr>
<tr>
<td>
  housing allowance
</td>
<td dir="rtl">
  بدل السكن
</td>
<td dir="rtl">
  بدل السكن
</td>
<td>
</td>
<td></td>
</tr>
<tr>
<td>
  transport allowance
</td>
<td dir="rtl">
  بدل المواصلات
</td>
<td dir="rtl">
  بدل المواصلات
</td>
<td>
  Possible variants: بدل النقل, بدل الانتقال.
</td>
<td></td>
</tr>
<tr>
<td>
  gross pay
</td>
<td dir="rtl">
  إجمالي الراتب
</td>
<td dir="rtl">
  إجمالي الراتب
</td>
<td>
  Alternative: الراتب الإجمالي.
</td>
<td></td>
</tr>
<tr>
<td>
  net pay
</td>
<td dir="rtl">
  صافي الراتب
</td>
<td dir="rtl">
  صافي الراتب
</td>
<td>
</td>
<td></td>
</tr>
<tr>
<td>
  deduction
</td>
<td dir="rtl">
  خصم / الخصومات
</td>
<td dir="rtl">
  خصم
</td>
<td>
  Possible variant: الاستقطاعات; verify which.
</td>
<td></td>
</tr>
<tr>
<td>
  payslip
</td>
<td dir="rtl">
  (none in code; plan 13: قسيمة راتبك)
</td>
<td dir="rtl">
  قسيمة الراتب
</td>
<td>
  Possible variants: مفردات الراتب, كشف الراتب.
</td>
<td></td>
</tr>
<tr>
<td>
  pay run
</td>
<td dir="rtl">
  مسير الرواتب
</td>
<td dir="rtl">
  مسير الرواتب
</td>
<td>
  Verify regional usage; other regions may say كشف المرتبات.
</td>
<td></td>
</tr>
<tr>
<td>
  overtime
</td>
<td dir="rtl">
  العمل الإضافي
</td>
<td dir="rtl">
  العمل الإضافي
</td>
<td>
  Also: ساعات العمل الإضافية.
</td>
<td></td>
</tr>
<tr>
<td>
  end-of-service gratuity
</td>
<td dir="rtl">
  مكافأة نهاية الخدمة
</td>
<td dir="rtl">
  مكافأة نهاية الخدمة
</td>
<td>
  Avoid bare مكافأة (bonus). Related: مستحقات نهاية الخدمة.
</td>
<td></td>
</tr>
<tr>
<td>
  notice pay
</td>
<td dir="rtl">
  بدل الإنذار
</td>
<td dir="rtl">
  بدل الإشعار
</td>
<td>
  Official text may say مهلة الإشعار; verify. إنذار means warning.
</td>
<td></td>
</tr>
<tr>
<td>
  leave encashment
</td>
<td dir="rtl">
  بدل نقدي عن الإجازة السنوية
</td>
<td dir="rtl">
  بدل رصيد الإجازات
</td>
<td>
  Two wordings in repo; unify.
</td>
<td></td>
</tr>
<tr>
<td>
  unused leave pay
</td>
<td dir="rtl">
  بدل الإجازة غير المستخدمة
</td>
<td dir="rtl">
  بدل الإجازة غير المستخدمة
</td>
<td>
  Same concept as leave encashment.
</td>
<td></td>
</tr>
<tr>
<td>
  annual leave
</td>
<td dir="rtl">
  الإجازة السنوية
</td>
<td dir="rtl">
  الإجازة السنوية
</td>
<td>
</td>
<td></td>
</tr>
<tr>
<td>
  sick leave
</td>
<td dir="rtl">
  الإجازة المرضية
</td>
<td dir="rtl">
  الإجازة المرضية
</td>
<td>
</td>
<td></td>
</tr>
<tr>
<td>
  maternity leave
</td>
<td dir="rtl">
  إجازة الوضع
</td>
<td dir="rtl">
  إجازة الأمومة
</td>
<td>
  Verify the term the UAE law and users prefer.
</td>
<td></td>
</tr>
<tr>
<td>
  unpaid leave
</td>
<td dir="rtl">
  بدون أجر / بدون راتب
</td>
<td dir="rtl">
  إجازة بدون أجر
</td>
<td>
  Repo says both. Possibly بدون أجر in official texts; verify.
</td>
<td></td>
</tr>
<tr>
<td>
  rest day
</td>
<td dir="rtl">
  أيام الراحة
</td>
<td dir="rtl">
  يوم الراحة الأسبوعية
</td>
<td>
</td>
<td></td>
</tr>
<tr>
<td>
  official holiday
</td>
<td dir="rtl">
  العطلات الرسمية
</td>
<td dir="rtl">
  العطلة الرسمية
</td>
<td>
</td>
<td></td>
</tr>
<tr>
<td>
  probation
</td>
<td dir="rtl">
  فترة التجربة
</td>
<td dir="rtl">
  فترة التجربة
</td>
<td>
</td>
<td></td>
</tr>
<tr>
<td>
  employer
</td>
<td dir="rtl">
  صاحب العمل
</td>
<td dir="rtl">
  صاحب العمل
</td>
<td>
  Possibly the term used in official texts; verify.
</td>
<td></td>
</tr>
<tr>
<td>
  company
</td>
<td dir="rtl">
  الشركة
</td>
<td dir="rtl">
  الشركة / المنشأة
</td>
<td>
  Official texts may say المنشأة; verify.
</td>
<td></td>
</tr>
<tr>
<td>
  employee
</td>
<td dir="rtl">
  الموظف
</td>
<td dir="rtl">
  الموظف
</td>
<td>
  Official texts may say العامل; verify. Pick for UI vs legal lines.
</td>
<td></td>
</tr>
<tr>
<td>
  WPS
</td>
<td dir="rtl">
  نظام حماية الأجور
</td>
<td dir="rtl">
  نظام حماية الأجور (WPS)
</td>
<td>
  Keep the Latin abbreviation in brackets on first use?
</td>
<td></td>
</tr>
<tr>
<td>
  SIF file
</td>
<td dir="rtl">
  ملف الرواتب
</td>
<td dir="rtl">
  ملف معلومات الراتب (SIF)
</td>
<td>
  Verify with a WPS-using accountant.
</td>
<td></td>
</tr>
<tr>
<td>
  bank routing code
</td>
<td dir="rtl">
  رمز توجيه البنك
</td>
<td dir="rtl">
  رمز التوجيه المصرفي
</td>
<td>
</td>
<td></td>
</tr>
<tr>
<td>
  IBAN
</td>
<td dir="rtl">
  (none)
</td>
<td dir="rtl">
  رقم الحساب المصرفي الدولي (آيبان)
</td>
<td>
</td>
<td></td>
</tr>
<tr>
<td>
  pension authority (GPSSA)
</td>
<td dir="rtl">
  (not named; المعاش)
</td>
<td dir="rtl">
  الهيئة العامة للمعاشات والتأمينات الاجتماعية
</td>
<td>
  The Arabic never names the body.
</td>
<td></td>
</tr>
<tr>
<td>
  pension contribution
</td>
<td dir="rtl">
  اشتراك المعاش / الاشتراك
</td>
<td dir="rtl">
  اشتراك المعاشات
</td>
<td>
  Repo uses both short and long forms.
</td>
<td></td>
</tr>
<tr>
<td>
  labour ministry (MOHRE)
</td>
<td dir="rtl">
  (none)
</td>
<td dir="rtl">
  وزارة الموارد البشرية والتوطين
</td>
<td>
</td>
<td></td>
</tr>
<tr>
<td>
  loan / advance
</td>
<td dir="rtl">
  قرض
</td>
<td dir="rtl">
  سلفة (advance) or قرض (loan)
</td>
<td>
  Different things; verify.
</td>
<td></td>
</tr>
<tr>
<td>
  violation
</td>
<td dir="rtl">
  مخالفة
</td>
<td dir="rtl">
  مخالفة / غرامة
</td>
<td>
</td>
<td></td>
</tr>
<tr>
<td>
  damage
</td>
<td dir="rtl">
  إتلاف
</td>
<td dir="rtl">
  تلف / ضرر
</td>
<td>
  إتلاف implies destruction.
</td>
<td></td>
</tr>
<tr>
<td>
  court-ordered
</td>
<td dir="rtl">
  بموجب حكم قضائي
</td>
<td dir="rtl">
  بأمر قضائي
</td>
<td>
  Order vs judgment.
</td>
<td></td>
</tr>
<tr>
<td>
  approve
</td>
<td dir="rtl">
  اعتمد / اعتماد
</td>
<td dir="rtl">
  اعتماد (workflow)
</td>
<td>
  Avoid معتمد as an adjective on figures.
</td>
<td></td>
</tr>
<tr>
<td>
  approval or consent
</td>
<td dir="rtl">
  الموافقة / وافق
</td>
<td dir="rtl">
  موافقة
</td>
<td>
  Keep consent and approval distinct.
</td>
<td></td>
</tr>
<tr>
<td>
  hypothetical
</td>
<td dir="rtl">
  افتراضي
</td>
<td dir="rtl">
  فرضي
</td>
<td>
  افتراضي usually means default.
</td>
<td></td>
</tr>
<tr>
<td>
  official (source)
</td>
<td dir="rtl">
  رسمي
</td>
<td dir="rtl">
  رسمي
</td>
<td>
  See [CLAIM] discussion.
</td>
<td></td>
</tr>
<tr>
<td>
  demo / sample
</td>
<td dir="rtl">
  تجريبي / نموذجي
</td>
<td dir="rtl">
  تجريبي
</td>
<td>
  Repo also uses عينة in plans.
</td>
<td></td>
</tr>
<tr>
<td>
  authenticator app
</td>
<td dir="rtl">
  تطبيق المصادقة
</td>
<td dir="rtl">
  تطبيق المصادقة
</td>
<td>
</td>
<td></td>
</tr>
<tr>
<td>
  currency
</td>
<td dir="rtl">
  (AED in Latin script)
</td>
<td dir="rtl">
  درهم or د.إ or AED
</td>
<td>
  Three spellings across code and plans.
</td>
<td></td>
</tr>
<tr>
<td>
  month names
</td>
<td dir="rtl">
  (Intl ar-AE)
</td>
<td dir="rtl">
  نوفمبر, ديسمبر ...
</td>
<td>
  Gulf style; Levant says تشرين الثاني.
</td>
<td></td>
</tr>
</table>

## 5. String tables by area

Columns: id or key and source file; English source text; current Arabic text;
context (where it appears) with flags; risk; and an empty column for the
reviewer decision or correction. Rows are sorted HIGH first within each area.
Long lines wrap inside cells.

### Area A. Payslip lines (29)

Engine payslip explanation text: packages/engine/src/explain/payroll-catalog.ts.
Rendered by explainTrace for payroll traces and shown next to money. Not called
by any API route or screen yet, so it is reachable only through the engine
package.

<table>
<tr>
  <th>id / key</th>
  <th>English source</th>
  <th>Current Arabic</th>
  <th>Context and flags</th>
  <th>Risk</th>
  <th>Reviewer decision / correction</th>
</tr>
<tr>
<td>
  <code>PAY:payroll.days</code><br>
  payroll-catalog.ts:75
</td>
<td>
  Paid share of the month in half-days: {result} ({in.unpaidDays} unpaid
  days, {in.halfPayDays} half-pay days) ({rules}).
</td>
<td dir="rtl">
  الحصة المدفوعة من الشهر بأنصاف الأيام: {result} ({in.unpaidDays} أيام بدون
  أجر، {in.halfPayDays} أيام بنصف أجر) ({rules}).
</td>
<td>
  Payslip explanation line (trace id payroll.days). Printed next to the
  amount when explainTrace(trace, "ar") renders a payroll trace. No API
  route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [PLURAL] "أيام" is fixed for {in.unpaidDays} and {in.halfPayDays}:
  wrong for 0, 1, 2 and fractions.<br>
  [TERM] "بأنصاف الأيام" (in half-days) reads unusual. "بدون أجر" here,
  but the seed data says "بدون راتب" (أجر vs راتب).
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:leave.sick</code><br>
  payroll-catalog.ts:77
</td>
<td>
  Sick leave this month: {in.fullPay} days full pay, {in.halfPay} half pay,
  {in.unpaid} unpaid, {in.beyond} unpaid beyond the legal limit,
  {in.probation} unpaid in probation ({rules}).
</td>
<td dir="rtl">
  الإجازة المرضية هذا الشهر: {in.fullPay} أيام بأجر كامل، {in.halfPay} بنصف
  أجر، {in.unpaid} بدون أجر، {in.beyond} بدون أجر بعد الحد القانوني،
  {in.probation} بدون أجر خلال فترة التجربة ({rules}).
</td>
<td>
  Payslip explanation line (trace id leave.sick). Printed next to the
  amount when explainTrace(trace, "ar") renders a payroll trace. No API
  route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [CLAIM] "بعد الحد القانوني" states a legal limit. Confirm it only
  repeats the source rule and is not a legal conclusion.<br>
  [PLURAL] "أيام" is fixed; later counts are bare numbers with no unit.<br>
  [TERM] "فترة التجربة" for probation.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:leave.maternity</code><br>
  payroll-catalog.ts:81
</td>
<td>
  Maternity leave this month: {in.fullPay} days full pay, {in.halfPay} half
  pay, {in.unpaid} unpaid, {in.beyond} unpaid beyond the legal limit
  ({rules}).
</td>
<td dir="rtl">
  إجازة الوضع هذا الشهر: {in.fullPay} أيام بأجر كامل، {in.halfPay} بنصف أجر،
  {in.unpaid} بدون أجر، {in.beyond} بدون أجر بعد الحد القانوني ({rules}).
</td>
<td>
  Payslip explanation line (trace id leave.maternity). Printed next to
  the amount when explainTrace(trace, "ar") renders a payroll trace. No
  API route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [GULF] "إجازة الوضع" vs "إجازة الأمومة" (the second may be more common
  in product UIs). Verify the term.<br>
  [CLAIM] "الحد القانوني" as above.<br>
  [PLURAL] "أيام" is fixed.<br>
  [GENDER] Concerns a female employee only; check agreement.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:earn.basic</code><br>
  payroll-catalog.ts:84
</td>
<td>
  Basic salary for the period: {result} ({rules}).
</td>
<td dir="rtl">
  الراتب الأساسي عن الفترة: {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id earn.basic). Printed next to the
  amount when explainTrace(trace, "ar") renders a payroll trace. No API
  route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [TERM] "الراتب الأساسي" (the official Arabic text may say الأجر
  الأساسي; verify). Same label as the demo salary component.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:earn.allowance</code><br>
  payroll-catalog.ts:85
</td>
<td>
  Allowance {in.code}: {result} ({rules}).
</td>
<td dir="rtl">
  البدل {in.code}: {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id earn.allowance). Printed next to
  the amount when explainTrace(trace, "ar") renders a payroll trace. No
  API route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [TERM] "بدل" (allowance) is also used for pay in lieu (leave.pay,
  notice pay, leave encashment): three meanings.<br>
  [BIDI] {in.code} is a Latin allowance code inside RTL text.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:earn.overtime.normal</code><br>
  payroll-catalog.ts:86
</td>
<td>
  Overtime pay, {in.minutes} minutes: {result} ({rules}).
</td>
<td dir="rtl">
  أجر العمل الإضافي، {in.minutes} دقيقة: {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id earn.overtime.normal). Printed next
  to the amount when explainTrace(trace, "ar") renders a payroll trace.
  No API route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [PLURAL] "{in.minutes} دقيقة" is singular for every count: wrong for
  1, 2 and 3-10 (دقائق).<br>
  [TERM] "أجر العمل الإضافي": verify against "ساعات العمل الإضافية".
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:earn.overtime.night</code><br>
  payroll-catalog.ts:88
</td>
<td>
  Night overtime pay (22:00 to 04:00), {in.minutes} minutes: {result}
  ({rules}).
</td>
<td dir="rtl">
  أجر العمل الإضافي الليلي (من 22:00 إلى 04:00)، {in.minutes} دقيقة:
  {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id earn.overtime.night). Printed next
  to the amount when explainTrace(trace, "ar") renders a payroll trace.
  No API route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [CLAIM] Embeds a legal definition of night work (22:00 to 04:00).<br>
  [BIDI] Time range with colons inside RTL parentheses.<br>
  [DIGIT] Western digits.<br>
  [PLURAL] As for normal overtime.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:earn.rest-day</code><br>
  payroll-catalog.ts:90
</td>
<td>
  Pay for work on rest days ({in.days} paid, {in.daysOff} days off in lieu):
  {result} ({rules}).
</td>
<td dir="rtl">
  أجر العمل في أيام الراحة ({in.days} مدفوعة، {in.daysOff} أيام راحة بديلة):
  {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id earn.rest-day). Printed next to the
  amount when explainTrace(trace, "ar") renders a payroll trace. No API
  route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [PLURAL] "{in.daysOff} أيام" is fixed; "{in.days} مدفوعة" agreement
  with a variable count.<br>
  [TERM] "أيام الراحة" vs "الراحة الأسبوعية"; "راحة بديلة" for days off
  in lieu.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:earn.holiday</code><br>
  payroll-catalog.ts:92
</td>
<td>
  Pay for work on official holidays ({in.days} paid, {in.daysOff} days off
  in lieu): {result} ({rules}).
</td>
<td dir="rtl">
  أجر العمل في العطلات الرسمية ({in.days} مدفوعة، {in.daysOff} أيام راحة
  بديلة): {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id earn.holiday). Printed next to the
  amount when explainTrace(trace, "ar") renders a payroll trace. No API
  route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [PLURAL] "{in.daysOff} أيام" is fixed; "{in.days} مدفوعة" agreement.<br>
  [TERM] "العطلات الرسمية" for official holidays.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:earn.leave-encashment</code><br>
  payroll-catalog.ts:94
</td>
<td>
  Annual leave paid in cash, {in.days} days: {result} ({rules}).
</td>
<td dir="rtl">
  بدل نقدي عن الإجازة السنوية، {in.days} أيام: {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id earn.leave-encashment). Printed
  next to the amount when explainTrace(trace, "ar") renders a payroll
  trace. No API route or screen calls it for payslips yet; only
  settlements are explained today.<br>
  [TERM] "بدل نقدي عن الإجازة السنوية" and settlement line leave.pay
  "بدل الإجازة غير المستخدمة" word one concept two ways.<br>
  [PLURAL] "{in.days} أيام" is fixed.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:earn.gross</code><br>
  payroll-catalog.ts:96
</td>
<td>
  Gross pay: {result} ({rules}).
</td>
<td dir="rtl">
  إجمالي الراتب: {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id earn.gross). Printed next to the
  amount when explainTrace(trace, "ar") renders a payroll trace. No API
  route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [TERM] "إجمالي الراتب" (gross) vs "مجموع" used for other totals;
  "صافي" for net.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:gpssa.salary</code><br>
  payroll-catalog.ts:97
</td>
<td>
  Pension contribution salary (fixed in {in.fixingMonth}): {result}
  ({rules}).
</td>
<td dir="rtl">
  راتب حساب الاشتراك (المحدد في {in.fixingMonth}): {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id gpssa.salary). Printed next to the
  amount when explainTrace(trace, "ar") renders a payroll trace. No API
  route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [TERM] "راتب حساب الاشتراك" is a literal rendering of "contribution
  salary"; the usual phrase may differ. Verify.<br>
  [BIDI] {in.fixingMonth} is a YYYY-MM code.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:gpssa.employee-share</code><br>
  payroll-catalog.ts:99
</td>
<td>
  Employee pension share this month: {result} ({rules}).
</td>
<td dir="rtl">
  حصة الموظف في الاشتراك هذا الشهر: {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id gpssa.employee-share). Printed next
  to the amount when explainTrace(trace, "ar") renders a payroll trace.
  No API route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [TERM] "الاشتراك" bare here, "اشتراك المعاش" elsewhere. The Arabic
  never names the pension authority; verify the wording.<br>
  [GULF] Check "المعاش" vs "المعاش التقاعدي".
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:gpssa.employer-gross</code><br>
  payroll-catalog.ts:101
</td>
<td>
  Employer pension share before government support: {result} ({rules}).
</td>
<td dir="rtl">
  حصة صاحب العمل في الاشتراك قبل دعم الحكومة: {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id gpssa.employer-gross). Printed next
  to the amount when explainTrace(trace, "ar") renders a payroll trace.
  No API route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [TERM] "قبل دعم الحكومة" (before government support). Verify.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:gpssa.gov-support</code><br>
  payroll-catalog.ts:103
</td>
<td>
  Part of the employer share paid by the government: {result} ({rules}).
</td>
<td dir="rtl">
  الجزء الذي تتحمله الحكومة من حصة صاحب العمل: {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id gpssa.gov-support). Printed next to
  the amount when explainTrace(trace, "ar") renders a payroll trace. No
  API route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [CLAIM] States as fact that the government bears part of the employer
  share (a financial and legal statement).
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:cap.base</code><br>
  payroll-catalog.ts:105
</td>
<td>
  Wage used for deduction limits: {result} ({rules}).
</td>
<td dir="rtl">
  الأجر الذي تُحسب عليه حدود الخصم: {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id cap.base). Printed next to the
  amount when explainTrace(trace, "ar") renders a payroll trace. No API
  route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [CLAIM] "حدود الخصم" implies a legal limit. The plan wording "الأجر
  المعتمد" was removed because "معتمد" reads as approved or certified
  (plan-5 build report, M7).<br>
  [TERM] "الأجر" here, "الراتب" elsewhere.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:cap.overall</code><br>
  payroll-catalog.ts:106
</td>
<td>
  Most that may be deducted this month ({in.capPercent} of the wage):
  {result} ({rules}).
</td>
<td dir="rtl">
  أقصى ما يجوز خصمه هذا الشهر ({in.capPercent} من الأجر): {result}
  ({rules}).
</td>
<td>
  Payslip explanation line (trace id cap.overall). Printed next to the
  amount when explainTrace(trace, "ar") renders a payroll trace. No API
  route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [CLAIM] "أقصى ما يجوز خصمه" says what is permitted: a legal
  conclusion. The plan wording "نصف الأجر" was removed.<br>
  [DIGIT] {in.capPercent} shows a percent: "50%" vs "٪50" vs "50٪" in
  RTL.<br>
  [BIDI] Percent sign and digits inside parentheses.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:ded.gpssa</code><br>
  payroll-catalog.ts:108
</td>
<td>
  Pension contribution, employee share: {result} ({rules}).
</td>
<td dir="rtl">
  اشتراك المعاش، حصة الموظف: {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id ded.gpssa). Printed next to the
  amount when explainTrace(trace, "ar") renders a payroll trace. No API
  route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [TERM] "اشتراك المعاش" vs bare "الاشتراك" in gpssa lines.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:ded.overpayment</code><br>
  payroll-catalog.ts:109
</td>
<td>
  Recovery of an overpayment {in.ref}: {result} ({rules}).
</td>
<td dir="rtl">
  استرداد مبلغ مدفوع بالزيادة {in.ref}: {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id ded.overpayment). Printed next to
  the amount when explainTrace(trace, "ar") renders a payroll trace. No
  API route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [BIDI] {in.ref} is a Latin or alphanumeric reference.<br>
  [TERM] "مبلغ مدفوع بالزيادة" (amount paid in excess). Verify.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:ded.violation</code><br>
  payroll-catalog.ts:110
</td>
<td>
  Deduction for violation {in.ref}: {result} ({rules}).
</td>
<td dir="rtl">
  خصم بسبب مخالفة {in.ref}: {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id ded.violation). Printed next to the
  amount when explainTrace(trace, "ar") renders a payroll trace. No API
  route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [CLAIM] "مخالفة" asserts the employee committed a violation; legal
  weight. Compare "غرامة" (fine) or "جزاء".<br>
  [BIDI] {in.ref}.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:ded.damage</code><br>
  payroll-catalog.ts:111
</td>
<td>
  Deduction for damage {in.ref}: {result} ({rules}).
</td>
<td dir="rtl">
  خصم بسبب إتلاف {in.ref}: {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id ded.damage). Printed next to the
  amount when explainTrace(trace, "ar") renders a payroll trace. No API
  route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [CLAIM] "إتلاف" (destruction) asserts liability for damage. Compare
  "تلف" or "ضرر".<br>
  [BIDI] {in.ref}.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:ded.court-debt</code><br>
  payroll-catalog.ts:112
</td>
<td>
  Court-ordered deduction {in.ref}: {result} ({rules}).
</td>
<td dir="rtl">
  خصم بموجب حكم قضائي {in.ref}: {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id ded.court-debt). Printed next to
  the amount when explainTrace(trace, "ar") renders a payroll trace. No
  API route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [CLAIM] "بموجب حكم قضائي" states a legal basis (court judgment).
  English is "court-ordered" (an order, not a judgment). Verify.<br>
  [BIDI] {in.ref}.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:ded.scheme</code><br>
  payroll-catalog.ts:113
</td>
<td>
  Deduction for a savings or welfare scheme {in.ref}: {result} ({rules}).
</td>
<td dir="rtl">
  خصم لصالح نظام ادخار أو رعاية {in.ref}: {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id ded.scheme). Printed next to the
  amount when explainTrace(trace, "ar") renders a payroll trace. No API
  route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [CLAIM] "نظام" also means law or regulation in Gulf usage, so "نظام
  ادخار" can read as a legal scheme. The plan wording "نظام معتمد" was
  removed.<br>
  [BIDI] {in.ref}.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:ded.loan</code><br>
  payroll-catalog.ts:114
</td>
<td>
  Loan repayment {in.ref}: {result} ({rules}).
</td>
<td dir="rtl">
  سداد قرض {in.ref}: {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id ded.loan). Printed next to the
  amount when explainTrace(trace, "ar") renders a payroll trace. No API
  route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [TERM] "قرض" (loan) vs "سلفة" (advance on salary). Verify.<br>
  [BIDI] {in.ref}.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:ded.total</code><br>
  payroll-catalog.ts:115
</td>
<td>
  Total deductions: {result} ({rules}).
</td>
<td dir="rtl">
  مجموع الخصومات: {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id ded.total). Printed next to the
  amount when explainTrace(trace, "ar") renders a payroll trace. No API
  route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [TERM] "مجموع" vs "إجمالي" used for totals.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:pay.net</code><br>
  payroll-catalog.ts:116
</td>
<td>
  Net pay: {result} ({rules}).
</td>
<td dir="rtl">
  صافي الراتب: {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id pay.net). Printed next to the
  amount when explainTrace(trace, "ar") renders a payroll trace. No API
  route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [TERM] "صافي الراتب" for net pay; the payslip bottom line.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:employer.gpssa</code><br>
  payroll-catalog.ts:117
</td>
<td>
  Employer pension contribution payable: {result} ({rules}).
</td>
<td dir="rtl">
  اشتراك المعاش المستحق على صاحب العمل: {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id employer.gpssa). Printed next to
  the amount when explainTrace(trace, "ar") renders a payroll trace. No
  API route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [TERM] "المستحق على صاحب العمل" (payable by the employer). Verify.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:employer.total</code><br>
  payroll-catalog.ts:118
</td>
<td>
  Employer cost on top of gross pay: {result} ({rules}).
</td>
<td dir="rtl">
  تكلفة صاحب العمل فوق إجمالي الراتب: {result} ({rules}).
</td>
<td>
  Payslip explanation line (trace id employer.total). Printed next to
  the amount when explainTrace(trace, "ar") renders a payroll trace. No
  API route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [TERM] "فوق إجمالي الراتب" is colloquial; verify register.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PAY:payroll.period</code><br>
  payroll-catalog.ts:73
</td>
<td>
  Pay period {in.payStart} to {in.payEnd}: {result} days ({rules}).
</td>
<td dir="rtl">
  فترة الراتب من {in.payStart} إلى {in.payEnd}: {result} يومًا ({rules}).
</td>
<td>
  Payslip explanation line (trace id payroll.period). Printed next to
  the amount when explainTrace(trace, "ar") renders a payroll trace. No
  API route or screen calls it for payslips yet; only settlements are
  explained today.<br>
  [BIDI] ISO dates {in.payStart} and {in.payEnd} are inserted raw, with
  no isolate, next to Arabic words.<br>
  [DIGIT] Western digits by design (see section 3).<br>
  [PLURAL] "{result} يومًا" fits 11-99 days only; a part-month joiner
  can give fewer days. Confirm the tanween style.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
</table>

### Area B. Settlement and gratuity lines (10)

Engine end-of-service settlement text: packages/engine/src/explain/catalog.ts.
Returned by the API as settlement.explanation.ar and printed by the engine CLI.

<table>
<tr>
  <th>id / key</th>
  <th>English source</th>
  <th>Current Arabic</th>
  <th>Context and flags</th>
  <th>Risk</th>
  <th>Reviewer decision / correction</th>
</tr>
<tr>
<td>
  <code>SET:service.days</code><br>
  catalog.ts:43
</td>
<td>
  Days of service counted: {result} ({rules}).
</td>
<td dir="rtl">
  أيام الخدمة المحتسبة: {result} ({rules}).
</td>
<td>
  Settlement explanation: days of service counted. Reachable today
  through the API settlement response (explanation.ar) and the engine
  CLI.<br>
  [TERM] "أيام الخدمة المحتسبة" fine; verify "المحتسبة" vs "المحسوبة".
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SET:service.years</code><br>
  catalog.ts:44
</td>
<td>
  Completed service: {result} ({rules}).
</td>
<td dir="rtl">
  مدة الخدمة المكتملة: {result} ({rules}).
</td>
<td>
  Settlement explanation: completed service. {result} is replaced by
  YEARS_TEXT (see STATUS area). Reachable today through the API
  settlement response (explanation.ar) and the engine CLI.<br>
  [PLURAL] See YEARS_TEXT: one fixed form.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SET:gratuity.tier1</code><br>
  catalog.ts:45
</td>
<td>
  Gratuity days owed in tier 1: {result} ({rules}).
</td>
<td dir="rtl">
  أيام المكافأة المستحقة في الشريحة الأولى: {result} ({rules}).
</td>
<td>
  Settlement explanation: gratuity days in tier 1. Reachable today
  through the API settlement response (explanation.ar) and the engine
  CLI.<br>
  [TERM] Bare "المكافأة" can read as "bonus"; English says gratuity.<br>
  [GULF] "الشريحة" for tier.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SET:gratuity.tier2</code><br>
  catalog.ts:47
</td>
<td>
  Gratuity days owed in tier 2: {result} ({rules}).
</td>
<td dir="rtl">
  أيام المكافأة المستحقة في الشريحة الثانية: {result} ({rules}).
</td>
<td>
  Settlement explanation: gratuity days in tier 2. Reachable today
  through the API settlement response (explanation.ar) and the engine
  CLI.<br>
  [TERM] Bare "المكافأة" as above.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SET:gratuity.cap</code><br>
  catalog.ts:49
</td>
<td>
  Gratuity cap (limit on the total): {result} ({rules}).
</td>
<td dir="rtl">
  الحد الأقصى للمكافأة: {result} ({rules}).
</td>
<td>
  Settlement explanation: gratuity cap amount. Reachable today through
  the API settlement response (explanation.ar) and the engine CLI.<br>
  [TERM] Bare "المكافأة"; the English adds "(limit on the total)" and
  the Arabic does not.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SET:gratuity.total</code><br>
  catalog.ts:50
</td>
<td>
  End-of-service gratuity: {result} ({rules}).
</td>
<td dir="rtl">
  مكافأة نهاية الخدمة: {result} ({rules}).
</td>
<td>
  Settlement explanation: the gratuity amount. Reachable today through
  the API settlement response (explanation.ar) and the engine CLI.<br>
  [GULF] "مكافأة نهاية الخدمة" is the term the task asks us to verify.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SET:gratuity.total.not-eligible</code><br>
  catalog.ts:51
</td>
<td>
  End-of-service gratuity: {result}, not eligible: {in.completedYears}
  completed years is below the minimum of {in.minServiceYears} ({rules}).
</td>
<td dir="rtl">
  مكافأة نهاية الخدمة: {result}، غير مستحقة: {in.completedYears} سنوات خدمة
  مكتملة أقل من الحد الأدنى البالغ {in.minServiceYears} ({rules}).
</td>
<td>
  Settlement explanation: gratuity is zero because service is below the
  minimum. Reachable today through the API settlement response
  (explanation.ar) and the engine CLI.<br>
  [CLAIM] "غير مستحقة" (not due) states an entitlement conclusion to the
  employee.<br>
  [PLURAL] "{in.completedYears} سنوات" is fixed: 0, 1 and 2 need other
  forms.<br>
  [GRAM] "الحد الأدنى البالغ {in.minServiceYears}" has no unit (years).
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SET:gratuity.total.not-applicable</code><br>
  catalog.ts:54
</td>
<td>
  End-of-service gratuity: {result}, not applicable: UAE nationals'
  end-of-service benefits fall under the pension legislation, not the Labour
  Law gratuity ({rules}).
</td>
<td dir="rtl">
  مكافأة نهاية الخدمة: {result}، لا تنطبق: تخضع مستحقات نهاية الخدمة
  للمواطنين الإماراتيين لتشريعات المعاشات، لا لمكافأة قانون العمل ({rules}).
</td>
<td>
  Settlement explanation: gratuity is zero for UAE nationals. Reachable
  today through the API settlement response (explanation.ar) and the
  engine CLI.<br>
  [CLAIM] A legal conclusion: nationals fall under pension legislation
  "لا لمكافأة قانون العمل". Verify accuracy and whether the employee
  should see it.<br>
  [TERM] "مستحقات نهاية الخدمة" and "مكافأة" in one sentence.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SET:leave.pay</code><br>
  catalog.ts:57
</td>
<td>
  Pay for unused leave: {result} ({rules}).
</td>
<td dir="rtl">
  بدل الإجازة غير المستخدمة: {result} ({rules}).
</td>
<td>
  Settlement explanation: pay for unused leave. Reachable today through
  the API settlement response (explanation.ar) and the engine CLI.<br>
  [TERM] "بدل الإجازة غير المستخدمة" vs earn.leave-encashment wording.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SET:settlement.total</code><br>
  catalog.ts:58
</td>
<td>
  Computed total (excludes notice pay, deductions and other dues): {result}
  ({rules}).
</td>
<td dir="rtl">
  المجموع المحسوب (لا يشمل بدل الإنذار والخصومات والمستحقات الأخرى):
  {result} ({rules}).
</td>
<td>
  Settlement explanation and CLI header: computed total with its
  exclusions. Reachable today through the API settlement response
  (explanation.ar) and the engine CLI.<br>
  [CLAIM] "المجموع المحسوب" is a hedge. Confirm it reads as non-final.<br>
  [TERM] "بدل الإنذار" for notice pay; the law text may use إشعار.<br>
  [GULF] See notice pay in section 4.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
</table>

### Area C. Status words, years text and CLI labels (18)

Words appended to every explanation line, the years phrase, and the CLI headers:
catalog.ts and cli-text.ts.

<table>
<tr>
  <th>id / key</th>
  <th>English source</th>
  <th>Current Arabic</th>
  <th>Context and flags</th>
  <th>Risk</th>
  <th>Reviewer decision / correction</th>
</tr>
<tr>
<td>
  <code>STATUS:official</code><br>
  catalog.ts:79
</td>
<td>
  official
</td>
<td dir="rtl">
  رسمي
</td>
<td>
  Status word appended in parentheses to every payslip and settlement
  explanation line, e.g. "(رسمي)". States how trustworthy the rule
  behind the figure is.<br>
  [CLAIM] Printed after every figure, "(رسمي)" can read as "this figure
  is official or approved by the authority". English means "the rule
  comes from an official source". Consider wording about the source, not
  the figure.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>STATUS:secondary</code><br>
  catalog.ts:79
</td>
<td>
  secondary
</td>
<td dir="rtl">
  ثانوي
</td>
<td>
  Status word appended in parentheses to every payslip and settlement
  explanation line, e.g. "(رسمي)". States how trustworthy the rule
  behind the figure is.<br>
  [TERM] "ثانوي" reads as minor or secondary in importance, not
  "secondary source".
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>STATUS:convention</code><br>
  catalog.ts:79
</td>
<td>
  convention
</td>
<td dir="rtl">
  اختيار النظام
</td>
<td>
  Status word appended in parentheses to every payslip and settlement
  explanation line, e.g. "(رسمي)". States how trustworthy the rule
  behind the figure is.<br>
  [CLAIM] "اختيار النظام": "نظام" also means regulation, so it can read
  as "the regulation's choice". The code deliberately avoids "عرف"
  (custom is a source of law).
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>STATUS:hypothetical</code><br>
  catalog.ts:80
</td>
<td>
  hypothetical
</td>
<td dir="rtl">
  افتراضي
</td>
<td>
  Status word appended in parentheses to every payslip and settlement
  explanation line, e.g. "(رسمي)". States how trustworthy the rule
  behind the figure is.<br>
  [TERM] "افتراضي" most often means "default" in software UIs. "فرضي" is
  the usual word for hypothetical. Verify.<br>
  [CLAIM] Meant to say "not law"; the reader may not get that.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>STATUS:unsourced</code><br>
  catalog.ts:80
</td>
<td>
  unsourced
</td>
<td dir="rtl">
  بلا مصدر
</td>
<td>
  Status word appended in parentheses to every payslip and settlement
  explanation line, e.g. "(رسمي)". States how trustworthy the rule
  behind the figure is.<br>
  [CLAIM] "بلا مصدر" may read as "unreliable" rather than "no source
  recorded".
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>STATUS:none</code><br>
  catalog.ts:80
</td>
<td>
  no rules
</td>
<td dir="rtl">
  بلا قواعد
</td>
<td>
  Status word appended in parentheses to every payslip and settlement
  explanation line, e.g. "(رسمي)". States how trustworthy the rule
  behind the figure is.<br>
  [CLAIM] "بلا قواعد" (without rules) can read as lawless; English means
  "no rule applied".
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>STATUS:overridden</code><br>
  catalog.ts:81
</td>
<td>
  overridden
</td>
<td dir="rtl">
  قيمة مستبدلة
</td>
<td>
  Status word appended in parentheses to every payslip and settlement
  explanation line, e.g. "(رسمي)". States how trustworthy the rule
  behind the figure is.<br>
  [TERM] "قيمة مستبدلة" (replaced value). Noun phrase while the others
  are adjectives.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>STATUS:YEARS_TEXT</code><br>
  catalog.ts:88
</td>
<td>
  {y} years and {d} days
</td>
<td dir="rtl">
  {y} سنوات و{d} أيام
</td>
<td>
  Replaces the result of the service.years line, e.g. "3 years and 12
  days".<br>
  [PLURAL] One form for every number: wrong for 1 (سنة), 2 (سنتان), 11+
  (سنة) and for days 1, 2 and 11+.<br>
  [BIDI] "و{d}" glues the conjunction to a placeholder.<br>
  [DIGIT] Western digits.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>CLI:total</code><br>
  cli-text.ts:31
</td>
<td>
  Computed total (excludes notice pay, deductions and other dues):
</td>
<td dir="rtl">
  المجموع المحسوب (لا يشمل بدل الإنذار والخصومات والمستحقات الأخرى):
</td>
<td>
  CLI header above the settlement total (same wording as
  settlement.total).<br>
  [CLAIM] Same hedge as SET:settlement.total.<br>
  [TERM] "بدل الإنذار" (notice pay).
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>CLI:notComputed</code><br>
  cli-text.ts:33
</td>
<td>
  Not computed:
</td>
<td dir="rtl">
  غير محسوب:
</td>
<td>
  CLI label before the list of items the settlement leaves out.<br>
  [CLAIM] Tells the reader what is missing from the money; must not read
  as complete.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>CLI:hypothetical</code><br>
  cli-text.ts:34
</td>
<td>
  HYPOTHETICAL (not law):
</td>
<td dir="rtl">
  افتراضي (ليس قانوناً):
</td>
<td>
  CLI banner on what-if scenarios.<br>
  [CLAIM] "ليس قانوناً" is a legal statement ("not law").<br>
  [GRAM] Tanween style "قانوناً" differs from "يومًا" used elsewhere.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>CLI:items.notice pay</code><br>
  cli-text.ts:30
</td>
<td>
  notice pay
</td>
<td dir="rtl">
  بدل الإنذار
</td>
<td>
  CLI: names an item the settlement does not compute, listed after the
  not-computed label.<br>
  [TERM] "بدل الإنذار"; the official text may say إشعار; verify.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>CLI:items.deductions</code><br>
  cli-text.ts:30
</td>
<td>
  deductions
</td>
<td dir="rtl">
  الخصومات
</td>
<td>
  CLI: names an item the settlement does not compute, listed after the
  not-computed label.<br>
  [TERM] "الخصومات" vs "الاستقطاعات".
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>CLI:items.other dues</code><br>
  cli-text.ts:30
</td>
<td>
  other dues
</td>
<td dir="rtl">
  المستحقات الأخرى
</td>
<td>
  CLI: names an item the settlement does not compute, listed after the
  not-computed label.<br>
  [CLAIM] "المستحقات الأخرى" (other dues) is open-ended wording about
  what the employee is owed.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>CLI:before</code><br>
  cli-text.ts:35
</td>
<td>
  Before:
</td>
<td dir="rtl">
  قبل:
</td>
<td>
  CLI label on a what-if comparison.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>CLI:after</code><br>
  cli-text.ts:36
</td>
<td>
  After:
</td>
<td dir="rtl">
  بعد:
</td>
<td>
  CLI label on a what-if comparison.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>CLI:delta</code><br>
  cli-text.ts:37
</td>
<td>
  Delta:
</td>
<td dir="rtl">
  الفرق:
</td>
<td>
  CLI label on a what-if comparison.<br>
  [TERM] "الفرق" (difference).
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>CLI:listSeparator</code><br>
  cli-text.ts:38
</td>
<td>
  ,
</td>
<td dir="rtl">
  ،
</td>
<td>
  CLI separator between list items.<br>
  [BIDI] Arabic comma here; statusList in explain.ts joins statuses with
  a Latin ", " (known gap in LEDGER.md).
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
</table>

### Area D. Web app strings and product name (27)

apps/web/src/i18n (ar/common.ts, en/common.ts) and apps/web/src/brand.ts. The
only Arabic an employee can reach in the web app today.

<table>
<tr>
  <th>id / key</th>
  <th>English source</th>
  <th>Current Arabic</th>
  <th>Context and flags</th>
  <th>Risk</th>
  <th>Reviewer decision / correction</th>
</tr>
<tr>
<td>
  <code>WEB:common.arReviewBanner</code><br>
  common.ts:17
</td>
<td>
  Arabic text awaiting native review
</td>
<td dir="rtl">
  النص العربي بانتظار مراجعة متحدث أصلي
</td>
<td>
  Banner shown above the page whenever Arabic is selected. Rendered
  today. It is the only disclosure that the Arabic is unreviewed.<br>
  [CLAIM] Must be unmistakable. Review the wording and consider adding
  that figures and legal wording may be wrong.<br>
  [GENDER] "متحدث أصلي" is masculine; "متحدث أو متحدثة" or "ناطق" is an
  option.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.sampleData</code><br>
  common.ts:14
</td>
<td>
  Sample data
</td>
<td dir="rtl">
  بيانات تجريبية
</td>
<td>
  Badge in the header in mock mode. Rendered today. Tells the user the
  numbers are fake.<br>
  [TERM] "تجريبي" here; "نموذجي" in the contract example; "عينة" in the
  plans.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.sampleDataHint</code><br>
  common.ts:15
</td>
<td>
  Demo data in this browser only. Reloading the page starts again from the
  sample, so changes are not kept.
</td>
<td dir="rtl">
  بيانات تجريبية في هذا المتصفح فقط. إعادة تحميل الصفحة تعيدها إلى العينة،
  فلا تُحفظ التغييرات.
</td>
<td>
  Tooltip on the sample-data badge. Rendered today.<br>
  [GRAM] "فلا تُحفظ التغييرات": check the passive and the "فـ"
  connector.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.loading</code><br>
  common.ts:19
</td>
<td>
  Loading
</td>
<td dir="rtl">
  جارٍ التحميل
</td>
<td>
  Loading label. Catalog only: no screen renders it yet.<br>
  [GRAM] "جارٍ" with tanween.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.tryAgain</code><br>
  common.ts:20
</td>
<td>
  Try again
</td>
<td dir="rtl">
  حاول مرة أخرى
</td>
<td>
  Retry button label. Catalog only.<br>
  [GENDER] Masculine imperative "حاول".
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.reference</code><br>
  common.ts:21
</td>
<td>
  Reference: {requestId}
</td>
<td dir="rtl">
  المرجع: {requestId}
</td>
<td>
  Support reference shown under an error. Catalog only.<br>
  [BIDI] {requestId} is a Latin id inside RTL text; needs an LTR
  isolate.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.employees.zero</code><br>
  common.ts:23
</td>
<td>
  (English has only one and other)
</td>
<td dir="rtl">
  لا يوجد موظفون
</td>
<td>
  Count of employees (Arabic plural category "zero"; Intl.PluralRules
  ar: zero=0, one=1, two=2, few=3-10, many=11-99, other=100-102 and
  fractions). Catalog only.<br>
  [PLURAL] Verify the form for category zero.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.employees.one</code><br>
  common.ts:24
</td>
<td>
  {count} employee
</td>
<td dir="rtl">
  موظف واحد
</td>
<td>
  Count of employees (Arabic plural category "one"; Intl.PluralRules ar:
  zero=0, one=1, two=2, few=3-10, many=11-99, other=100-102 and
  fractions). Catalog only.<br>
  [PLURAL] Verify the form for category one.<br>
  [GENDER] Masculine nouns; no feminine form.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.employees.two</code><br>
  common.ts:25
</td>
<td>
  (English has only one and other)
</td>
<td dir="rtl">
  موظفان
</td>
<td>
  Count of employees (Arabic plural category "two"; Intl.PluralRules ar:
  zero=0, one=1, two=2, few=3-10, many=11-99, other=100-102 and
  fractions). Catalog only.<br>
  [PLURAL] Verify the form for category two.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.employees.few</code><br>
  common.ts:26
</td>
<td>
  (English has only one and other)
</td>
<td dir="rtl">
  {count} موظفين
</td>
<td>
  Count of employees (Arabic plural category "few"; Intl.PluralRules ar:
  zero=0, one=1, two=2, few=3-10, many=11-99, other=100-102 and
  fractions). Catalog only.<br>
  [PLURAL] Verify the form for category few.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.employees.many</code><br>
  common.ts:27
</td>
<td>
  (English has only one and other)
</td>
<td dir="rtl">
  {count} موظفًا
</td>
<td>
  Count of employees (Arabic plural category "many"; Intl.PluralRules
  ar: zero=0, one=1, two=2, few=3-10, many=11-99, other=100-102 and
  fractions). Catalog only.<br>
  [PLURAL] Verify the form for category many.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.employees.other</code><br>
  common.ts:28
</td>
<td>
  {count} employees
</td>
<td dir="rtl">
  {count} موظف
</td>
<td>
  Count of employees (Arabic plural category "other"; Intl.PluralRules
  ar: zero=0, one=1, two=2, few=3-10, many=11-99, other=100-102 and
  fractions). Catalog only.<br>
  [PLURAL] Verify the form for category other.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.days.zero</code><br>
  common.ts:31
</td>
<td>
  (English has only one and other)
</td>
<td dir="rtl">
  لا أيام
</td>
<td>
  Count of days (Arabic plural category "zero"; Intl.PluralRules ar:
  zero=0, one=1, two=2, few=3-10, many=11-99, other=100-102 and
  fractions). Catalog only.<br>
  [PLURAL] Verify the form for category zero.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.days.one</code><br>
  common.ts:32
</td>
<td>
  {count} day
</td>
<td dir="rtl">
  يوم واحد
</td>
<td>
  Count of days (Arabic plural category "one"; Intl.PluralRules ar:
  zero=0, one=1, two=2, few=3-10, many=11-99, other=100-102 and
  fractions). Catalog only.<br>
  [PLURAL] Verify the form for category one.<br>
  [GENDER] Masculine nouns; no feminine form.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.days.two</code><br>
  common.ts:33
</td>
<td>
  (English has only one and other)
</td>
<td dir="rtl">
  يومان
</td>
<td>
  Count of days (Arabic plural category "two"; Intl.PluralRules ar:
  zero=0, one=1, two=2, few=3-10, many=11-99, other=100-102 and
  fractions). Catalog only.<br>
  [PLURAL] Verify the form for category two.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.days.few</code><br>
  common.ts:34
</td>
<td>
  (English has only one and other)
</td>
<td dir="rtl">
  {count} أيام
</td>
<td>
  Count of days (Arabic plural category "few"; Intl.PluralRules ar:
  zero=0, one=1, two=2, few=3-10, many=11-99, other=100-102 and
  fractions). Catalog only.<br>
  [PLURAL] Verify the form for category few.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.days.many</code><br>
  common.ts:35
</td>
<td>
  (English has only one and other)
</td>
<td dir="rtl">
  {count} يومًا
</td>
<td>
  Count of days (Arabic plural category "many"; Intl.PluralRules ar:
  zero=0, one=1, two=2, few=3-10, many=11-99, other=100-102 and
  fractions). Catalog only.<br>
  [PLURAL] Verify the form for category many.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.days.other</code><br>
  common.ts:36
</td>
<td>
  {count} days
</td>
<td dir="rtl">
  {count} يوم
</td>
<td>
  Count of days (Arabic plural category "other"; Intl.PluralRules ar:
  zero=0, one=1, two=2, few=3-10, many=11-99, other=100-102 and
  fractions). Catalog only.<br>
  [PLURAL] Verify the form for category other.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>BRAND:PRODUCT_NAME.ar</code><br>
  brand.ts:10
</td>
<td>
  HR and Payroll
</td>
<td dir="rtl">
  الموارد البشرية والرواتب
</td>
<td>
  Product name in the page header and browser tab title (documentTitle).
  Rendered today. A placeholder until the owner names the product.<br>
  [TERM] Literal "Human resources and payroll". Verify; the owner may
  supply a brand name instead.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.language</code><br>
  common.ts:7
</td>
<td>
  Language
</td>
<td dir="rtl">
  اللغة
</td>
<td>
  Accessible name (aria-label) of the language switcher. Rendered today
  (App.tsx).
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.arabic</code><br>
  common.ts:9
</td>
<td>
  العربية
</td>
<td dir="rtl">
  العربية
</td>
<td>
  Button label for Arabic, in Arabic. Rendered today (it is the only way
  to switch).
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.theme</code><br>
  common.ts:10
</td>
<td>
  Theme
</td>
<td dir="rtl">
  المظهر
</td>
<td>
  Accessible name of the theme switcher. Rendered today.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.themeLight</code><br>
  common.ts:11
</td>
<td>
  Light
</td>
<td dir="rtl">
  فاتح
</td>
<td>
  Theme button. Rendered today.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.themeDark</code><br>
  common.ts:12
</td>
<td>
  Dark
</td>
<td dir="rtl">
  داكن
</td>
<td>
  Theme button. Rendered today.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.themeSystem</code><br>
  common.ts:13
</td>
<td>
  System
</td>
<td dir="rtl">
  حسب الجهاز
</td>
<td>
  Theme button (follow the device). Rendered today.<br>
  [GULF] "حسب الجهاز" vs "تلقائي".
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:common.building</code><br>
  common.ts:18
</td>
<td>
  This app is being built. The screens come next.
</td>
<td dir="rtl">
  هذا التطبيق قيد البناء. الشاشات قادمة.
</td>
<td>
  Placeholder paragraph in the main area. Rendered today. Will be
  replaced by real screens.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>WEB:en/common.arabic</code><br>
  common.ts:7
</td>
<td>
  (English catalog) Arabic's own name for itself
</td>
<td dir="rtl">
  العربية
</td>
<td>
  In the English catalog: the language button label, so an English
  reader can find Arabic. Rendered today.<br>
  [TERM] "العربية" standard; no issue expected.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
</table>

### Area E. Web error messages (52)

apps/web/src/i18n/ar/errors.ts: one message per API error code. Not rendered by
any screen yet (errorText has no caller), but complete and typed.

<table>
<tr>
  <th>id / key</th>
  <th>English source</th>
  <th>Current Arabic</th>
  <th>Context and flags</th>
  <th>Risk</th>
  <th>Reviewer decision / correction</th>
</tr>
<tr>
<td>
  <code>ERR:SOD_VIOLATION</code><br>
  errors.ts:23
</td>
<td>
  You cannot approve something you created. Another person must approve it.
</td>
<td dir="rtl">
  لا يمكنك اعتماد شيء أنشأته بنفسك. يجب أن يعتمده شخص آخر.
</td>
<td>
  Error message for API code SOD_VIOLATION: a sign-in or permission
  problem. Catalog only: errorText has no caller in apps/web/src yet.<br>
  [CLAIM] Approval control wording. "اعتماد" can also mean accreditation
  or certification; plan-4 bans "معتمد" on wps text. The plans use
  "الموافقة" for approvals and consent.<br>
  [TERM] "شيء" is vague; "عنصر" or "طلب".<br>
  [GENDER] "شخص آخر" masculine.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:IDEMPOTENCY_KEY_REUSED</code><br>
  errors.ts:36
</td>
<td>
  This form was already sent with other details. Start the pay run again.
</td>
<td dir="rtl">
  أُرسل هذا النموذج سابقًا ببيانات مختلفة. ابدأ مسير الرواتب من جديد.
</td>
<td>
  Error message for API code IDEMPOTENCY_KEY_REUSED: a pay-run or
  payroll input problem. Catalog only: errorText has no caller in
  apps/web/src yet.<br>
  [TERM] "مسير الرواتب" (pay run); "النموذج" for form.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:RUN_EXISTS_FOR_PERIOD</code><br>
  errors.ts:38
</td>
<td>
  A pay run already exists for this month.
</td>
<td dir="rtl">
  يوجد مسير رواتب لهذا الشهر بالفعل.
</td>
<td>
  Error message for API code RUN_EXISTS_FOR_PERIOD: a pay-run or payroll
  input problem. Catalog only: errorText has no caller in apps/web/src
  yet.<br>
  [TERM] "مسير الرواتب" (pay run).
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:RUN_NOT_DRAFT</code><br>
  errors.ts:39
</td>
<td>
  This pay run is no longer a draft.
</td>
<td dir="rtl">
  لم يعد مسير الرواتب هذا مسودة.
</td>
<td>
  Error message for API code RUN_NOT_DRAFT: a pay-run or payroll input
  problem. Catalog only: errorText has no caller in apps/web/src yet.<br>
  [TERM] "مسودة" for draft.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:RUN_NOT_APPROVED</code><br>
  errors.ts:40
</td>
<td>
  Approve the pay run before preparing its salary file.
</td>
<td dir="rtl">
  اعتمد مسير الرواتب قبل إعداد ملف الرواتب.
</td>
<td>
  Error message for API code RUN_NOT_APPROVED: a pay-run or payroll
  input problem. Catalog only: errorText has no caller in apps/web/src
  yet.<br>
  [CLAIM] "اعتمد" is an instruction to approve a pay run (money). Same
  approve/certify ambiguity.<br>
  [TERM] "ملف الرواتب" for the salary file (SIF).
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:BASIC_COMPONENT_REQUIRED</code><br>
  errors.ts:43
</td>
<td>
  A basic salary component is required.
</td>
<td dir="rtl">
  يلزم وجود مكوّن الراتب الأساسي.
</td>
<td>
  Error message for API code BASIC_COMPONENT_REQUIRED: a pay-run or
  payroll input problem. Catalog only: errorText has no caller in
  apps/web/src yet.<br>
  [TERM] "مكوّن الراتب الأساسي" (basic salary component).
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:DUPLICATE_COMPONENT</code><br>
  errors.ts:44
</td>
<td>
  A salary component appears twice.
</td>
<td dir="rtl">
  أحد مكونات الراتب مكرر.
</td>
<td>
  Error message for API code DUPLICATE_COMPONENT: a pay-run or payroll
  input problem. Catalog only: errorText has no caller in apps/web/src
  yet.<br>
  [TERM] "مكونات الراتب" (salary components).
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:PAY_RUN_PROBLEMS</code><br>
  errors.ts:49
</td>
<td>
  Some employees need more details before the pay run can be created.
</td>
<td dir="rtl">
  يحتاج بعض الموظفين إلى بيانات إضافية قبل إنشاء مسير الرواتب.
</td>
<td>
  Error message for API code PAY_RUN_PROBLEMS: a pay-run or payroll
  input problem. Catalog only: errorText has no caller in apps/web/src
  yet.<br>
  [TERM] "مسير الرواتب".
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:EMPLOYEE_NOT_IN_PERIOD</code><br>
  errors.ts:51
</td>
<td>
  This person is not employed in this month.
</td>
<td dir="rtl">
  هذا الشخص غير موظف في هذا الشهر.
</td>
<td>
  Error message for API code EMPLOYEE_NOT_IN_PERIOD: a pay-run or
  payroll input problem. Catalog only: errorText has no caller in
  apps/web/src yet.<br>
  [GENDER] "غير موظف" masculine.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:ENTERED_AMOUNTS_REQUIRED</code><br>
  errors.ts:52
</td>
<td>
  Enter this month's amounts for this person.
</td>
<td dir="rtl">
  أدخل مبالغ هذا الشهر لهذا الشخص.
</td>
<td>
  Error message for API code ENTERED_AMOUNTS_REQUIRED: a pay-run or
  payroll input problem. Catalog only: errorText has no caller in
  apps/web/src yet.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:SETTLEMENT_INPUT_REQUIRED</code><br>
  errors.ts:53
</td>
<td>
  Enter the leaver's details.
</td>
<td dir="rtl">
  أدخل بيانات الموظف المغادر.
</td>
<td>
  Error message for API code SETTLEMENT_INPUT_REQUIRED: a pay-run or
  payroll input problem. Catalog only: errorText has no caller in
  apps/web/src yet.<br>
  [GENDER] "الموظف المغادر" (the leaver) masculine.<br>
  [TERM] "المغادر" vs "المنتهية خدمته".
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:COMPANY_WPS_SETTINGS_MISSING</code><br>
  errors.ts:54
</td>
<td>
  Add the company's WPS employer id and bank routing code first.
</td>
<td dir="rtl">
  أضف رقم صاحب العمل في نظام حماية الأجور ورمز توجيه البنك أولًا.
</td>
<td>
  Error message for API code COMPANY_WPS_SETTINGS_MISSING: a salary-file
  (WPS/SIF) or calculation-scope problem. Catalog only: errorText has no
  caller in apps/web/src yet.<br>
  [GULF] "نظام حماية الأجور" spelled out, no "WPS" abbreviation for a
  reader who knows it.<br>
  [TERM] "رمز توجيه البنك" (bank routing code); "رقم صاحب العمل"
  (employer id).
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:EMPLOYEE_BANK_MISSING</code><br>
  errors.ts:56
</td>
<td>
  Some employees have no bank details.
</td>
<td dir="rtl">
  بعض الموظفين بلا بيانات بنكية.
</td>
<td>
  Error message for API code EMPLOYEE_BANK_MISSING: a salary-file
  (WPS/SIF) or calculation-scope problem. Catalog only: errorText has no
  caller in apps/web/src yet.<br>
  [TERM] "بيانات بنكية" vs "مصرفية".
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:SIF_GENERATION_FAILED</code><br>
  errors.ts:57
</td>
<td>
  The salary file could not be prepared.
</td>
<td dir="rtl">
  تعذر إعداد ملف الرواتب.
</td>
<td>
  Error message for API code SIF_GENERATION_FAILED: a salary-file
  (WPS/SIF) or calculation-scope problem. Catalog only: errorText has no
  caller in apps/web/src yet.<br>
  [TERM] "ملف الرواتب" for the salary file (SIF).
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:ENGINE_REFUSED</code><br>
  errors.ts:58
</td>
<td>
  This case is not modelled yet, so nothing was calculated.
</td>
<td dir="rtl">
  هذه الحالة غير مشمولة بعد، لذلك لم يُحسب شيء.
</td>
<td>
  Error message for API code ENGINE_REFUSED: a salary-file (WPS/SIF) or
  calculation-scope problem. Catalog only: errorText has no caller in
  apps/web/src yet.<br>
  [CLAIM] "غير مشمولة بعد" (not covered yet) can read as a statement
  about legal scope.<br>
  [TERM] "الحالة" (case) is vague.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:RUN_INPUTS_CHANGED</code><br>
  errors.ts:64
</td>
<td>
  Salaries or unpaid leave changed since this draft was made. Void it and
  create the pay run again.
</td>
<td dir="rtl">
  تغيرت الرواتب أو الإجازات غير المدفوعة منذ إنشاء هذه المسودة. ألغها وأنشئ
  مسير الرواتب من جديد.
</td>
<td>
  Error message for API code RUN_INPUTS_CHANGED: a pay-run or payroll
  input problem. Catalog only: errorText has no caller in apps/web/src
  yet.<br>
  [TERM] "الإجازات غير المدفوعة" (unpaid leave); "ألغها" (void it)
  imperative.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:SALARY_MISSING</code><br>
  errors.ts:66
</td>
<td>
  This person has no salary set.
</td>
<td dir="rtl">
  لم يُحدَّد راتب لهذا الشخص.
</td>
<td>
  Error message for API code SALARY_MISSING: a pay-run or payroll input
  problem. Catalog only: errorText has no caller in apps/web/src yet.<br>
  [GENDER] "هذا الشخص".
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:generic</code><br>
  errors.ts:7
</td>
<td>
  Something went wrong. Try again.
</td>
<td dir="rtl">
  حدث خطأ. حاول مرة أخرى.
</td>
<td>
  Error message for API code generic: a general technical problem.
  Catalog only: errorText has no caller in apps/web/src yet.<br>
  [GENDER] Masculine imperatives throughout the catalog (حاول, اختر,
  سجّل): MSA default; confirm the product's chosen convention.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:NETWORK</code><br>
  errors.ts:8
</td>
<td>
  Could not reach the server. Check your connection and try again.
</td>
<td dir="rtl">
  تعذر الوصول إلى الخادم. تحقق من الاتصال وحاول مرة أخرى.
</td>
<td>
  Error message for API code NETWORK: a general technical problem.
  Catalog only: errorText has no caller in apps/web/src yet.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:CONTRACT_MISMATCH</code><br>
  errors.ts:9
</td>
<td>
  The server sent data this app does not understand. Report this with the
  reference below.
</td>
<td dir="rtl">
  أرسل الخادم بيانات لا يفهمها هذا التطبيق. أبلغ عن ذلك مع المرجع أدناه.
</td>
<td>
  Error message for API code CONTRACT_MISMATCH: a general technical
  problem. Catalog only: errorText has no caller in apps/web/src yet.<br>
  [GENDER] "أبلغ" masculine imperative.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:VALIDATION_FAILED</code><br>
  errors.ts:11
</td>
<td>
  Some of the details are not valid. Check the highlighted fields.
</td>
<td dir="rtl">
  بعض البيانات غير صالحة. راجع الحقول المحددة.
</td>
<td>
  Error message for API code VALIDATION_FAILED: a general technical
  problem. Catalog only: errorText has no caller in apps/web/src yet.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:COMPANY_HEADER_REQUIRED</code><br>
  errors.ts:12
</td>
<td>
  Choose a company first.
</td>
<td dir="rtl">
  اختر شركة أولًا.
</td>
<td>
  Error message for API code COMPANY_HEADER_REQUIRED: a company, invite
  or account problem. Catalog only: errorText has no caller in
  apps/web/src yet.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:IDEMPOTENCY_KEY_REQUIRED</code><br>
  errors.ts:13
</td>
<td>
  The request was incomplete. Try again.
</td>
<td dir="rtl">
  الطلب غير مكتمل. حاول مرة أخرى.
</td>
<td>
  Error message for API code IDEMPOTENCY_KEY_REQUIRED: a general
  technical problem. Catalog only: errorText has no caller in
  apps/web/src yet.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:INVITE_INVALID</code><br>
  errors.ts:14
</td>
<td>
  This invite link is not valid.
</td>
<td dir="rtl">
  رابط الدعوة غير صالح.
</td>
<td>
  Error message for API code INVITE_INVALID: a company, invite or
  account problem. Catalog only: errorText has no caller in apps/web/src
  yet.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:MFA_CODE_INVALID</code><br>
  errors.ts:15
</td>
<td>
  The authenticator code is not correct.
</td>
<td dir="rtl">
  رمز تطبيق المصادقة غير صحيح.
</td>
<td>
  Error message for API code MFA_CODE_INVALID: a sign-in or permission
  problem. Catalog only: errorText has no caller in apps/web/src yet.<br>
  [TERM] "تطبيق المصادقة" for authenticator app.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:UNAUTHENTICATED</code><br>
  errors.ts:16
</td>
<td>
  Your session has ended. Sign in again.
</td>
<td dir="rtl">
  انتهت جلستك. سجّل الدخول مرة أخرى.
</td>
<td>
  Error message for API code UNAUTHENTICATED: a sign-in or permission
  problem. Catalog only: errorText has no caller in apps/web/src yet.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:INVALID_CREDENTIALS</code><br>
  errors.ts:17
</td>
<td>
  Email, password or code is not correct
</td>
<td dir="rtl">
  البريد الإلكتروني أو كلمة المرور أو الرمز غير صحيح
</td>
<td>
  Error message for API code INVALID_CREDENTIALS: a sign-in or
  permission problem. Catalog only: errorText has no caller in
  apps/web/src yet.<br>
  [GRAM] No final full stop, same as the English (mirrors the source).
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:FORBIDDEN</code><br>
  errors.ts:19
</td>
<td>
  Your role cannot do this.
</td>
<td dir="rtl">
  دورك لا يسمح بهذا الإجراء.
</td>
<td>
  Error message for API code FORBIDDEN: a sign-in or permission problem.
  Catalog only: errorText has no caller in apps/web/src yet.<br>
  [TERM] "دورك" (your role) vs "صلاحياتك".
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:TENANT_FORBIDDEN</code><br>
  errors.ts:20
</td>
<td>
  You are not a member of this company.
</td>
<td dir="rtl">
  لست عضوًا في هذه الشركة.
</td>
<td>
  Error message for API code TENANT_FORBIDDEN: a sign-in or permission
  problem. Catalog only: errorText has no caller in apps/web/src yet.<br>
  [GENDER] "لست عضوًا" masculine predicate shown to any user.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:MFA_REQUIRED</code><br>
  errors.ts:21
</td>
<td>
  Sign in again with your authenticator code to continue.
</td>
<td dir="rtl">
  سجّل الدخول مرة أخرى برمز تطبيق المصادقة للمتابعة.
</td>
<td>
  Error message for API code MFA_REQUIRED: a sign-in or permission
  problem. Catalog only: errorText has no caller in apps/web/src yet.<br>
  [TERM] "تطبيق المصادقة".
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:MFA_ENROLMENT_REQUIRED</code><br>
  errors.ts:22
</td>
<td>
  Add an authenticator app to your account first.
</td>
<td dir="rtl">
  أضف تطبيق مصادقة إلى حسابك أولًا.
</td>
<td>
  Error message for API code MFA_ENROLMENT_REQUIRED: a sign-in or
  permission problem. Catalog only: errorText has no caller in
  apps/web/src yet.<br>
  [TERM] "تطبيق المصادقة".
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:NOT_FOUND</code><br>
  errors.ts:25
</td>
<td>
  This item was not found. It may have been removed.
</td>
<td dir="rtl">
  لم يُعثر على هذا العنصر. ربما حُذف.
</td>
<td>
  Error message for API code NOT_FOUND: a general technical problem.
  Catalog only: errorText has no caller in apps/web/src yet.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:EMAIL_TAKEN</code><br>
  errors.ts:26
</td>
<td>
  This email already has an account.
</td>
<td dir="rtl">
  لهذا البريد الإلكتروني حساب بالفعل.
</td>
<td>
  Error message for API code EMAIL_TAKEN: a company, invite or account
  problem. Catalog only: errorText has no caller in apps/web/src yet.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:ALREADY_MEMBER</code><br>
  errors.ts:27
</td>
<td>
  This person is already a member of the company.
</td>
<td dir="rtl">
  هذا الشخص عضو في الشركة بالفعل.
</td>
<td>
  Error message for API code ALREADY_MEMBER: a company, invite or
  account problem. Catalog only: errorText has no caller in apps/web/src
  yet.<br>
  [GENDER] "عضو" masculine; "هذا الشخص" used for "this person".
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:MFA_ALREADY_ENROLLED</code><br>
  errors.ts:28
</td>
<td>
  An authenticator app is already added.
</td>
<td dir="rtl">
  تمت إضافة تطبيق مصادقة بالفعل.
</td>
<td>
  Error message for API code MFA_ALREADY_ENROLLED: a sign-in or
  permission problem. Catalog only: errorText has no caller in
  apps/web/src yet.<br>
  [TERM] "تطبيق المصادقة".
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:MFA_NOT_STARTED</code><br>
  errors.ts:29
</td>
<td>
  Start adding an authenticator app first.
</td>
<td dir="rtl">
  ابدأ بإضافة تطبيق مصادقة أولًا.
</td>
<td>
  Error message for API code MFA_NOT_STARTED: a sign-in or permission
  problem. Catalog only: errorText has no caller in apps/web/src yet.<br>
  [TERM] "تطبيق المصادقة".
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:EMPLOYEE_NUMBER_TAKEN</code><br>
  errors.ts:30
</td>
<td>
  Another employee already has this number.
</td>
<td dir="rtl">
  هذا الرقم مستخدم لموظف آخر.
</td>
<td>
  Error message for API code EMPLOYEE_NUMBER_TAKEN: a company, invite or
  account problem. Catalog only: errorText has no caller in apps/web/src
  yet.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:LEAVE_OVERLAP</code><br>
  errors.ts:31
</td>
<td>
  These dates overlap another request for this person.
</td>
<td dir="rtl">
  هذه التواريخ تتداخل مع طلب آخر لهذا الشخص.
</td>
<td>
  Error message for API code LEAVE_OVERLAP: a leave or attendance
  problem. Catalog only: errorText has no caller in apps/web/src yet.<br>
  [GENDER] "هذا الشخص" (this person).
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:LEAVE_NOT_PENDING</code><br>
  errors.ts:32
</td>
<td>
  This request was already decided.
</td>
<td dir="rtl">
  تم البت في هذا الطلب بالفعل.
</td>
<td>
  Error message for API code LEAVE_NOT_PENDING: a leave or attendance
  problem. Catalog only: errorText has no caller in apps/web/src yet.<br>
  [TERM] "تم البت" (was decided): legal register.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:LEAVE_NOT_CANCELLABLE</code><br>
  errors.ts:33
</td>
<td>
  This request can no longer be cancelled.
</td>
<td dir="rtl">
  لم يعد من الممكن إلغاء هذا الطلب.
</td>
<td>
  Error message for API code LEAVE_NOT_CANCELLABLE: a leave or
  attendance problem. Catalog only: errorText has no caller in
  apps/web/src yet.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:ALREADY_CLOCKED_IN</code><br>
  errors.ts:34
</td>
<td>
  Already clocked in.
</td>
<td dir="rtl">
  تم تسجيل الحضور بالفعل.
</td>
<td>
  Error message for API code ALREADY_CLOCKED_IN: a leave or attendance
  problem. Catalog only: errorText has no caller in apps/web/src yet.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:NOT_CLOCKED_IN</code><br>
  errors.ts:35
</td>
<td>
  Not clocked in.
</td>
<td dir="rtl">
  لم يُسجَّل الحضور.
</td>
<td>
  Error message for API code NOT_CLOCKED_IN: a leave or attendance
  problem. Catalog only: errorText has no caller in apps/web/src yet.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:INVITE_USED</code><br>
  errors.ts:41
</td>
<td>
  This invite was already used.
</td>
<td dir="rtl">
  استُخدمت هذه الدعوة بالفعل.
</td>
<td>
  Error message for API code INVITE_USED: a company, invite or account
  problem. Catalog only: errorText has no caller in apps/web/src yet.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:INVITE_EXPIRED</code><br>
  errors.ts:42
</td>
<td>
  This invite has expired. Ask for a new one.
</td>
<td dir="rtl">
  انتهت صلاحية هذه الدعوة. اطلب دعوة جديدة.
</td>
<td>
  Error message for API code INVITE_EXPIRED: a company, invite or
  account problem. Catalog only: errorText has no caller in apps/web/src
  yet.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:LEAVE_CROSSES_YEAR</code><br>
  errors.ts:45
</td>
<td>
  A request cannot cross into the next year. Split it in two.
</td>
<td dir="rtl">
  لا يمكن أن يمتد الطلب إلى السنة التالية. قسّمه إلى طلبين.
</td>
<td>
  Error message for API code LEAVE_CROSSES_YEAR: a leave or attendance
  problem. Catalog only: errorText has no caller in apps/web/src yet.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:INSUFFICIENT_BALANCE</code><br>
  errors.ts:47
</td>
<td>
  Not enough leave balance for these dates.
</td>
<td dir="rtl">
  رصيد الإجازة لا يكفي لهذه التواريخ.
</td>
<td>
  Error message for API code INSUFFICIENT_BALANCE: a leave or attendance
  problem. Catalog only: errorText has no caller in apps/web/src yet.<br>
  [TERM] "رصيد الإجازة" (leave balance).
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:NO_EMPLOYEE_LINK</code><br>
  errors.ts:48
</td>
<td>
  Your account is not linked to an employee.
</td>
<td dir="rtl">
  حسابك غير مرتبط بموظف.
</td>
<td>
  Error message for API code NO_EMPLOYEE_LINK: a company, invite or
  account problem. Catalog only: errorText has no caller in apps/web/src
  yet.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:ACCOUNT_LOCKED</code><br>
  errors.ts:59
</td>
<td>
  This account is locked after too many attempts. Try again later.
</td>
<td dir="rtl">
  قُفل هذا الحساب بعد محاولات كثيرة. حاول لاحقًا.
</td>
<td>
  Error message for API code ACCOUNT_LOCKED: a sign-in or permission
  problem. Catalog only: errorText has no caller in apps/web/src yet.<br>
  [GRAM] "قُفل" vs "أُقفل".
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:INTERNAL</code><br>
  errors.ts:60
</td>
<td>
  The server had a problem. Try again.
</td>
<td dir="rtl">
  واجه الخادم مشكلة. حاول مرة أخرى.
</td>
<td>
  Error message for API code INTERNAL: a general technical problem.
  Catalog only: errorText has no caller in apps/web/src yet.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:INVITE_NOT_FOUND</code><br>
  errors.ts:61
</td>
<td>
  This invite was not found. Ask for a new one.
</td>
<td dir="rtl">
  لم يُعثر على هذه الدعوة. اطلب دعوة جديدة.
</td>
<td>
  Error message for API code INVITE_NOT_FOUND: a company, invite or
  account problem. Catalog only: errorText has no caller in apps/web/src
  yet.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:LAST_OWNER</code><br>
  errors.ts:62
</td>
<td>
  The company needs at least one owner. Make someone else an owner first.
</td>
<td dir="rtl">
  يجب أن يكون للشركة مالك واحد على الأقل. اجعل شخصًا آخر مالكًا أولًا.
</td>
<td>
  Error message for API code LAST_OWNER: a company, invite or account
  problem. Catalog only: errorText has no caller in apps/web/src yet.<br>
  [GENDER] "مالك" masculine.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>ERR:PAYLOAD_TOO_LARGE</code><br>
  errors.ts:67
</td>
<td>
  The request was too large.
</td>
<td dir="rtl">
  الطلب كبير جدًا.
</td>
<td>
  Error message for API code PAYLOAD_TOO_LARGE: a general technical
  problem. Catalog only: errorText has no caller in apps/web/src yet.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
</table>

### Area F. Contract example and mock seed data (34)

Example in packages/contract, and demo names in apps/web/src/api/mock (shown in
sample-data mode).

<table>
<tr>
  <th>id / key</th>
  <th>English source</th>
  <th>Current Arabic</th>
  <th>Context and flags</th>
  <th>Risk</th>
  <th>Reviewer decision / correction</th>
</tr>
<tr>
<td>
  <code>SEED:company.nameAr</code><br>
  seed.ts:25
</td>
<td>
  Sample Trading LLC (demo)
</td>
<td dir="rtl">
  شركة نموذج التجارية ذ.م.م (تجريبي)
</td>
<td>
  Demo seed data (company name). Visible in sample-data mode only, in
  the Arabic UI.<br>
  [CLAIM] "ذ.م.م" asserts a legal form (LLC) for a fake company.<br>
  [TERM] "(تجريبي)" for demo.<br>
  [GRAM] "شركة نموذج التجارية": check the construct (النموذج التجارية?).
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:leaveType.Annual leave</code><br>
  seed.ts:45
</td>
<td>
  Annual leave
</td>
<td dir="rtl">
  إجازة سنوية
</td>
<td>
  Demo seed data (leave type name). Visible in sample-data mode only, in
  the Arabic UI. Users pick it when requesting leave.<br>
  [TERM] "إجازة سنوية" standard.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:leaveType.Sick leave</code><br>
  seed.ts:46
</td>
<td>
  Sick leave
</td>
<td dir="rtl">
  إجازة مرضية
</td>
<td>
  Demo seed data (leave type name). Visible in sample-data mode only, in
  the Arabic UI. Users pick it when requesting leave.<br>
  [TERM] "إجازة مرضية" standard.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:leaveType.Unpaid leave</code><br>
  seed.ts:49
</td>
<td>
  Unpaid leave
</td>
<td dir="rtl">
  إجازة بدون راتب
</td>
<td>
  Demo seed data (leave type name). Visible in sample-data mode only, in
  the Arabic UI. Users pick it when requesting leave.<br>
  [TERM] "بدون راتب" here; explain lines say "بدون أجر" (راتب vs أجر).<br>
  [GULF] The official text may say "إجازة بدون أجر"; verify.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:component.basic</code><br>
  seed-people.ts:62
</td>
<td>
  Basic salary
</td>
<td dir="rtl">
  الراتب الأساسي
</td>
<td>
  Demo seed data (salary component name). Visible in sample-data mode
  only, in the Arabic UI. Appears on payslips and in salary setup.<br>
  [TERM] Same as PAY:earn.basic.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:component.housing</code><br>
  seed-people.ts:63
</td>
<td>
  Housing allowance
</td>
<td dir="rtl">
  بدل السكن
</td>
<td>
  Demo seed data (salary component name). Visible in sample-data mode
  only, in the Arabic UI. Appears on payslips and in salary setup.<br>
  [TERM] "بدل" + noun (allowance). Gulf variants: بدل سكن / بدل نقل.
  Verify.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:component.transport</code><br>
  seed-people.ts:67
</td>
<td>
  Transport allowance
</td>
<td dir="rtl">
  بدل المواصلات
</td>
<td>
  Demo seed data (salary component name). Visible in sample-data mode
  only, in the Arabic UI. Appears on payslips and in salary setup.<br>
  [TERM] "بدل" + noun (allowance). Gulf variants: بدل سكن / بدل نقل.
  Verify.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>CONTRACT:settlement.explanation.ar</code><br>
  examples-pay.ts:26
</td>
<td>
  Sample explanation.
</td>
<td dir="rtl">
  شرح نموذجي.
</td>
<td>
  Example value of the settlement explanation in the API contract
  examples (documentation and tests). Flag arReviewed is the literal
  false.<br>
  [TERM] "نموذجي" (sample) vs "تجريبي" (demo) vs "عينة".
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:department.Finance</code><br>
  seed-people.ts:8
</td>
<td>
  Finance
</td>
<td dir="rtl">
  المالية
</td>
<td>
  Demo seed data (department name). Visible in sample-data mode only, in
  the Arabic UI.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:department.Operations</code><br>
  seed-people.ts:9
</td>
<td>
  Operations
</td>
<td dir="rtl">
  العمليات
</td>
<td>
  Demo seed data (department name). Visible in sample-data mode only, in
  the Arabic UI.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:department.Sales</code><br>
  seed-people.ts:10
</td>
<td>
  Sales
</td>
<td dir="rtl">
  المبيعات
</td>
<td>
  Demo seed data (department name). Visible in sample-data mode only, in
  the Arabic UI.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:person.Sara Ali</code><br>
  seed-people.ts:38
</td>
<td>
  Sara Ali
</td>
<td dir="rtl">
  سارة علي
</td>
<td>
  Demo seed data (invented person name). Visible in sample-data mode
  only, in the Arabic UI.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:person.Omar Haddad</code><br>
  seed-people.ts:39
</td>
<td>
  Omar Haddad
</td>
<td dir="rtl">
  عمر حداد
</td>
<td>
  Demo seed data (invented person name). Visible in sample-data mode
  only, in the Arabic UI.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:person.Priya Nair</code><br>
  seed-people.ts:40
</td>
<td>
  Priya Nair
</td>
<td dir="rtl">
  بريا ناير
</td>
<td>
  Demo seed data (invented person name). Visible in sample-data mode
  only, in the Arabic UI.<br>
  [TERM] "ناير" vs "نائر" transliteration.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:person.Ahmed Khan</code><br>
  seed-people.ts:41
</td>
<td>
  Ahmed Khan
</td>
<td dir="rtl">
  أحمد خان
</td>
<td>
  Demo seed data (invented person name). Visible in sample-data mode
  only, in the Arabic UI.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:person.Fatima Zahra</code><br>
  seed-people.ts:42
</td>
<td>
  Fatima Zahra
</td>
<td dir="rtl">
  فاطمة الزهراء
</td>
<td>
  Demo seed data (invented person name). Visible in sample-data mode
  only, in the Arabic UI.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:person.John Mathew</code><br>
  seed-people.ts:43
</td>
<td>
  John Mathew
</td>
<td dir="rtl">
  جون ماثيو
</td>
<td>
  Demo seed data (invented person name). Visible in sample-data mode
  only, in the Arabic UI.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:person.Maria Santos</code><br>
  seed-people.ts:44
</td>
<td>
  Maria Santos
</td>
<td dir="rtl">
  ماريا سانتوس
</td>
<td>
  Demo seed data (invented person name). Visible in sample-data mode
  only, in the Arabic UI.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:person.Hassan Ibrahim</code><br>
  seed-people.ts:45
</td>
<td>
  Hassan Ibrahim
</td>
<td dir="rtl">
  حسن إبراهيم
</td>
<td>
  Demo seed data (invented person name). Visible in sample-data mode
  only, in the Arabic UI.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:person.Li Wei</code><br>
  seed-people.ts:47
</td>
<td>
  Li Wei
</td>
<td dir="rtl">
  لي وي
</td>
<td>
  Demo seed data (invented person name). Visible in sample-data mode
  only, in the Arabic UI.<br>
  [TERM] No standard Arabic form for a Chinese name; verify.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:person.Noura Saeed</code><br>
  seed-people.ts:48
</td>
<td>
  Noura Saeed
</td>
<td dir="rtl">
  نورة سعيد
</td>
<td>
  Demo seed data (invented person name). Visible in sample-data mode
  only, in the Arabic UI.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:person.Daniel Okafor</code><br>
  seed-people.ts:50
</td>
<td>
  Daniel Okafor
</td>
<td dir="rtl">
  دانيال أوكافور
</td>
<td>
  Demo seed data (invented person name). Visible in sample-data mode
  only, in the Arabic UI.<br>
  [TERM] Transliteration of Okafor is not standardised.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:person.Aisha Rahman</code><br>
  seed-people.ts:52
</td>
<td>
  Aisha Rahman
</td>
<td dir="rtl">
  عائشة رحمن
</td>
<td>
  Demo seed data (invented person name). Visible in sample-data mode
  only, in the Arabic UI.<br>
  [TERM] Transliteration "رحمن" vs "رحمان" / "الرحمن".
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:firstName.Rana</code><br>
  seed-large.ts:6
</td>
<td>
  Rana
</td>
<td dir="rtl">
  رنا
</td>
<td>
  Demo seed data (generated first name for the 60-row large dataset;
  combined as first + last). Visible in sample-data mode only, in the
  Arabic UI.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:firstName.Karim</code><br>
  seed-large.ts:6
</td>
<td>
  Karim
</td>
<td dir="rtl">
  كريم
</td>
<td>
  Demo seed data (generated first name for the 60-row large dataset;
  combined as first + last). Visible in sample-data mode only, in the
  Arabic UI.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:firstName.Meera</code><br>
  seed-large.ts:6
</td>
<td>
  Meera
</td>
<td dir="rtl">
  ميرا
</td>
<td>
  Demo seed data (generated first name for the 60-row large dataset;
  combined as first + last). Visible in sample-data mode only, in the
  Arabic UI.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:firstName.Yousef</code><br>
  seed-large.ts:7
</td>
<td>
  Yousef
</td>
<td dir="rtl">
  يوسف
</td>
<td>
  Demo seed data (generated first name for the 60-row large dataset;
  combined as first + last). Visible in sample-data mode only, in the
  Arabic UI.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:firstName.Grace</code><br>
  seed-large.ts:7
</td>
<td>
  Grace
</td>
<td dir="rtl">
  غريس
</td>
<td>
  Demo seed data (generated first name for the 60-row large dataset;
  combined as first + last). Visible in sample-data mode only, in the
  Arabic UI.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:firstName.Tariq</code><br>
  seed-large.ts:7
</td>
<td>
  Tariq
</td>
<td dir="rtl">
  طارق
</td>
<td>
  Demo seed data (generated first name for the 60-row large dataset;
  combined as first + last). Visible in sample-data mode only, in the
  Arabic UI.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:lastName.Mansour</code><br>
  seed-large.ts:8
</td>
<td>
  Mansour
</td>
<td dir="rtl">
  منصور
</td>
<td>
  Demo seed data (generated last name for the 60-row large dataset;
  combined as first + last). Visible in sample-data mode only, in the
  Arabic UI.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:lastName.Pillai</code><br>
  seed-large.ts:8
</td>
<td>
  Pillai
</td>
<td dir="rtl">
  بيلاي
</td>
<td>
  Demo seed data (generated last name for the 60-row large dataset;
  combined as first + last). Visible in sample-data mode only, in the
  Arabic UI.<br>
  [TERM] "بيلاي" vs "بيلّاي".
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:lastName.Reyes</code><br>
  seed-large.ts:8
</td>
<td>
  Reyes
</td>
<td dir="rtl">
  رييس
</td>
<td>
  Demo seed data (generated last name for the 60-row large dataset;
  combined as first + last). Visible in sample-data mode only, in the
  Arabic UI.<br>
  [TERM] "رييس" unusual; Spanish surname usually "ريس" or "رييس".
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:lastName.Farouk</code><br>
  seed-large.ts:9
</td>
<td>
  Farouk
</td>
<td dir="rtl">
  فاروق
</td>
<td>
  Demo seed data (generated last name for the 60-row large dataset;
  combined as first + last). Visible in sample-data mode only, in the
  Arabic UI.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>SEED:lastName.Odhiambo</code><br>
  seed-large.ts:9
</td>
<td>
  Odhiambo
</td>
<td dir="rtl">
  أوديامبو
</td>
<td>
  Demo seed data (generated last name for the 60-row large dataset;
  combined as first + last). Visible in sample-data mode only, in the
  Arabic UI.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
</table>

### Area G. Planned copy in docs (not in code yet) (45)

Arabic drafted in docs/superpowers/plans for plans 4, 7, 13, 14 and 17. Nothing
here ships today; review it now so it is not copied into code unreviewed.

<table>
<tr>
  <th>id / key</th>
  <th>English source</th>
  <th>Current Arabic</th>
  <th>Context and flags</th>
  <th>Risk</th>
  <th>Reviewer decision / correction</th>
</tr>
<tr>
<td>
  <code>PLAN13:approval-closed.subject</code><br>
  2026-11-26-plan-13-channels.md:627
</td>
<td>
  Your {subject} was {outcome}
</td>
<td dir="rtl">
  {subject} الخاصة بك {outcome}
</td>
<td>
  Planned notification (Plan 13), approval-closed: subject line. Not in
  code yet.<br>
  [GENDER] "الخاصة بك" (feminine) and {outcome} terms (تمت الموافقة
  عليها, تم رفضها, أعيدت للتعديل) are feminine: they only agree with
  feminine subjects like مطالبة. A masculine subject breaks agreement.<br>
  [CLAIM] Outcome statement about money claims.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:approval-closed.body</code><br>
  2026-11-26-plan-13-channels.md:627
</td>
<td>
  Your {subject} was {outcome}. Open the app for the details.
</td>
<td dir="rtl">
  {subject} الخاصة بك {outcome}. افتح التطبيق للتفاصيل.
</td>
<td>
  Planned notification (Plan 13), approval-closed: body (email, in-app,
  WhatsApp template).
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:leave-decided.subject</code><br>
  2026-11-26-plan-13-channels.md:630
</td>
<td>
  Your leave was {outcome}
</td>
<td dir="rtl">
  تم البت في إجازتك
</td>
<td>
  Planned notification (Plan 13), leave-decided: subject line. Not in
  code yet.<br>
  [GENDER] "إجازتك ... {outcome}": outcome terms are feminine; "إجازة"
  is feminine, so this one agrees, but check.<br>
  [CLAIM] States a decision about leave; "تم البت" is legal register.<br>
  [BIDI] Dates.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:leave-decided.body</code><br>
  2026-11-26-plan-13-channels.md:630
</td>
<td>
  Your leave from {start} to {end} was {outcome}.
</td>
<td dir="rtl">
  إجازتك من {start} إلى {end} {outcome}.
</td>
<td>
  Planned notification (Plan 13), leave-decided: body (email, in-app,
  WhatsApp template).
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:TEMPLATE_TERMS.outcome.approved</code><br>
  2026-11-26-plan-13-channels.md:580
</td>
<td>
  approved
</td>
<td dir="rtl">
  تمت الموافقة عليها
</td>
<td>
  Planned term spliced into notification templates (Plan 13).<br>
  [GENDER] Feminine forms; spliced after any subject.<br>
  [CLAIM] Outcome of an approval or request.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:TEMPLATE_TERMS.outcome.rejected</code><br>
  2026-11-26-plan-13-channels.md:581
</td>
<td>
  rejected
</td>
<td dir="rtl">
  تم رفضها
</td>
<td>
  Planned term spliced into notification templates (Plan 13).<br>
  [GENDER] Feminine forms; spliced after any subject.<br>
  [CLAIM] Outcome of an approval or request.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:TEMPLATE_TERMS.outcome.returned</code><br>
  2026-11-26-plan-13-channels.md:582
</td>
<td>
  returned for changes
</td>
<td dir="rtl">
  أعيدت للتعديل
</td>
<td>
  Planned term spliced into notification templates (Plan 13).<br>
  [GENDER] Feminine forms; spliced after any subject.<br>
  [CLAIM] Outcome of an approval or request.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:WHATSAPP_CONSENT_TEXT</code><br>
  2026-11-26-plan-13-channels.md:859
</td>
<td>
  I agree that {company} may send me work messages on WhatsApp, such as
  approval requests and notices, at the number below. Messages pass through
  Meta's WhatsApp service. I can stop at any time in the app or by replying
  STOP.
</td>
<td dir="rtl">
  أوافق على أن ترسل لي {company} رسائل عمل عبر واتساب، مثل طلبات الموافقة
  والإشعارات، على الرقم أدناه. تمر الرسائل عبر خدمة واتساب التابعة لشركة
  Meta. يمكنني الإيقاف في أي وقت من التطبيق أو بالرد بكلمة STOP.
</td>
<td>
  Planned WhatsApp opt-in consent text (Plan 13). The user agrees by
  ticking; the text is hashed and versioned as the consent record.<br>
  [CLAIM] Consent wording: the legal record of what the person agreed
  to. Needs the highest scrutiny, plus legal review.<br>
  [BIDI] Latin "Meta" and "STOP" inside RTL text; "STOP" is a command
  the user must type exactly.<br>
  [TERM] "واتساب" transliteration; "رسائل عمل" (work messages).<br>
  [GENDER] "أوافق", "يمكنني" unmarked.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN14:CONSENT_NOTICE.heading</code><br>
  2026-11-26-plan-14-meetings.md:1005
</td>
<td>
  Recording this meeting
</td>
<td dir="rtl">
  تسجيل هذا الاجتماع
</td>
<td>
  Planned meeting-recording consent notice (Plan 14). The notice is
  versioned and hashed as the consent record.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN14:CONSENT_NOTICE.intro</code><br>
  2026-11-26-plan-14-meetings.md:1005
</td>
<td>
  This meeting can be recorded only if everyone in it agrees. Your voice is
  personal data. You can say no and still join.
</td>
<td dir="rtl">
  لا يمكن تسجيل هذا الاجتماع إلا إذا وافق جميع الحاضرين. صوتك من بياناتك
  الشخصية. يمكنك الرفض والانضمام مع ذلك.
</td>
<td>
  Planned meeting-recording consent notice (Plan 14). The notice is
  versioned and hashed as the consent record.<br>
  [CLAIM] Consent precondition ("only if everyone agrees"); "صوتك من
  بياناتك الشخصية" is a data-protection statement. Legal review needed.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN14:CONSENT_NOTICE.purposes.record</code><br>
  2026-11-26-plan-14-meetings.md:1007
</td>
<td>
  Record the audio of this meeting. Video and screens are never recorded.
</td>
<td dir="rtl">
  تسجيل صوت هذا الاجتماع. لا يتم تسجيل الفيديو أو الشاشات أبدًا.
</td>
<td>
  Planned meeting-recording consent notice (Plan 14). The notice is
  versioned and hashed as the consent record.<br>
  [CLAIM] "أبدًا" (never) is an absolute promise about video and
  screens.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN14:CONSENT_NOTICE.purposes.transcribe</code><br>
  2026-11-26-plan-14-meetings.md:1008
</td>
<td>
  Turn the recording into a written transcript using our transcription
  provider.
</td>
<td dir="rtl">
  تحويل التسجيل إلى نص مكتوب عبر مزود التفريغ النصي لدينا.
</td>
<td>
  Planned meeting-recording consent notice (Plan 14). The notice is
  versioned and hashed as the consent record.<br>
  [TERM] "مزود التفريغ النصي" (transcription provider).
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN14:CONSENT_NOTICE.purposes.summarise</code><br>
  2026-11-26-plan-14-meetings.md:1009
</td>
<td>
  Use our language-model provider to draft meeting notes and proposed action
  items from the transcript. A person must confirm every action item before
  it becomes a task.
</td>
<td dir="rtl">
  استخدام مزود النموذج اللغوي لدينا لإعداد مسودة ملاحظات ومهام مقترحة من
  النص. يجب أن يؤكد شخص كل مهمة قبل أن تصبح مهمة فعلية.
</td>
<td>
  Planned meeting-recording consent notice (Plan 14). The notice is
  versioned and hashed as the consent record.<br>
  [CLAIM] Names an AI provider ("النموذج اللغوي") and promises human
  confirmation of every task.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN14:CONSENT_NOTICE.withdraw</code><br>
  2026-11-26-plan-14-meetings.md:1011
</td>
<td>
  You can withdraw at any time. If you withdraw consent to recording,
  recording stops and this meeting's recording and everything made from it
  are deleted for everyone.
</td>
<td dir="rtl">
  يمكنك سحب موافقتك في أي وقت. إذا سحبت موافقتك على التسجيل يتوقف التسجيل
  ويُحذف تسجيل هذا الاجتماع وكل ما نتج عنه للجميع.
</td>
<td>
  Planned meeting-recording consent notice (Plan 14). The notice is
  versioned and hashed as the consent record.<br>
  [CLAIM] Promises deletion "للجميع" (for everyone) on withdrawal; a
  legal commitment about data.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN14:CONSENT_NOTICE.retention</code><br>
  2026-11-26-plan-14-meetings.md:1013
</td>
<td>
  Your company keeps recordings and transcripts for {days} days, then
  deletes them.
</td>
<td dir="rtl">
  تحتفظ شركتك بالتسجيلات والنصوص لمدة {days} يومًا ثم تحذفها.
</td>
<td>
  Planned meeting-recording consent notice (Plan 14). The notice is
  versioned and hashed as the consent record.<br>
  [PLURAL] "{days} يومًا" correct for 11-99 only; 1, 2, 3-10 and 100+
  differ. A retention period is a legal commitment.<br>
  [DIGIT] Western digits.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN14:RECORDING_BANNER</code><br>
  2026-11-26-plan-14-meetings.md:1014
</td>
<td>
  Recording. Everyone here agreed to be recorded. Audio only.
</td>
<td dir="rtl">
  جارٍ التسجيل. وافق جميع الحاضرين على التسجيل. الصوت فقط.
</td>
<td>
  Planned banner shown during a recording (Plan 14).<br>
  [CLAIM] Asserts that all attendees consented: a factual claim that
  must be true whenever shown.<br>
  [PLURAL] "جميع الحاضرين" generic masculine plural.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN7:formatMoney.ar</code><br>
  2026-11-26-plan-7-documents.md:972
</td>
<td>
  AED 4,000.00
</td>
<td dir="rtl">
  4,000.00 درهم
</td>
<td>
  Planned letter money format (Plan 7): currency after the number.<br>
  [DIGIT] Conflicts with the shipped format (AED 4,000.00 with LTR
  isolates) and with plan-17 "د.إ": three currency spellings.<br>
  [BIDI] Number then word in RTL: confirm the visual order.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN7:starter-ban-list</code><br>
  2026-11-26-plan-7-documents.md:1046
</td>
<td>
  article, law, decree, binding, signature, ministry
</td>
<td dir="rtl">
  المادة، قانون، مرسوم، ملزم، توقيع، وزارة
</td>
<td>
  Planned test that keeps legal words out of Arabic letter starters
  (Plan 7). A reviewer should extend the list.<br>
  [CLAIM] The list is a guard against legal claims. Suggest adding
  متوافق، مطابق، معتمد، مصدق، شهادة and "رسمي" variants. Verify.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN4:wps-ban-list</code><br>
  2026-11-26-plan-4-web-app.md:1276
</td>
<td>
  compliant, certified
</td>
<td dir="rtl">
  مطابق، معتمد
</td>
<td>
  Planned test that keeps compliance words out of Arabic WPS finding
  text (Plan 4).<br>
  [CLAIM] The Arabic list has two words; add متوافق (compliant), مستوفٍ,
  سليم. Payroll text is not scanned because "معتمد" also means an
  approved run.
</td>
<td>
  <b>HIGH</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:approval-pending.subject</code><br>
  2026-11-26-plan-13-channels.md:626
</td>
<td>
  Approval waiting: {subject}
</td>
<td dir="rtl">
  موافقة بانتظارك: {subject}
</td>
<td>
  Planned notification (Plan 13), approval-pending: subject line. Not in
  code yet.<br>
  [CLAIM] Approval request wording: "الموافقة" here, "اعتماد" in the
  errors (see glossary).<br>
  [GENDER] "طلب منك", "افتح" masculine.<br>
  [GRAM] Agreement with {subject} (a term) is fixed.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:approval-pending.body</code><br>
  2026-11-26-plan-13-channels.md:626
</td>
<td>
  {requester} asked you to approve: {subject}. Open the app to review it.
</td>
<td dir="rtl">
  طلب منك {requester} الموافقة على: {subject}. افتح التطبيق لمراجعتها.
</td>
<td>
  Planned notification (Plan 13), approval-pending: body (email, in-app,
  WhatsApp template).
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:leave-requested.subject</code><br>
  2026-11-26-plan-13-channels.md:629
</td>
<td>
  Leave request from {requester}
</td>
<td dir="rtl">
  طلب إجازة من {requester}
</td>
<td>
  Planned notification (Plan 13), leave-requested: subject line. Not in
  code yet.<br>
  [BIDI] {start} and {end} dates inside RTL text.<br>
  [GENDER] "افتح".
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:leave-requested.body</code><br>
  2026-11-26-plan-13-channels.md:629
</td>
<td>
  {requester} asked for leave from {start} to {end}. Open the app to review
  it.
</td>
<td dir="rtl">
  طلب {requester} إجازة من {start} إلى {end}. افتح التطبيق لمراجعته.
</td>
<td>
  Planned notification (Plan 13), leave-requested: body (email, in-app,
  WhatsApp template).
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:payslip-available.subject</code><br>
  2026-11-26-plan-13-channels.md:631
</td>
<td>
  Your payslip is ready
</td>
<td dir="rtl">
  قسيمة راتبك جاهزة
</td>
<td>
  Planned notification (Plan 13), payslip-available: subject line. Not
  in code yet.<br>
  [TERM] "قسيمة راتبك" for payslip (first appearance of the word).<br>
  [BIDI] {period} is YYYY-MM.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:payslip-available.body</code><br>
  2026-11-26-plan-13-channels.md:631
</td>
<td>
  Your payslip for {period} is ready in the app.
</td>
<td dir="rtl">
  قسيمة راتبك لشهر {period} جاهزة في التطبيق.
</td>
<td>
  Planned notification (Plan 13), payslip-available: body (email,
  in-app, WhatsApp template).
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:security-sso-linked.subject</code><br>
  2026-11-26-plan-13-channels.md:635
</td>
<td>
  New sign-in method added
</td>
<td dir="rtl">
  تمت إضافة طريقة دخول جديدة
</td>
<td>
  Planned notification (Plan 13), security-sso-linked: subject line. Not
  in code yet.<br>
  [GENDER] "إن لم تكن أنت" masculine.<br>
  [CLAIM] Security notice; wording must be unambiguous.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:security-sso-linked.body</code><br>
  2026-11-26-plan-13-channels.md:635
</td>
<td>
  A {provider} sign-in was linked to your account. If this was not you, tell
  your administrator now.
</td>
<td dir="rtl">
  تم ربط تسجيل دخول {provider} بحسابك. إن لم تكن أنت، أبلغ المسؤول فورًا.
</td>
<td>
  Planned notification (Plan 13), security-sso-linked: body (email,
  in-app, WhatsApp template).
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:channel-verify-code.subject</code><br>
  2026-11-26-plan-13-channels.md:636
</td>
<td>
  Your verification code
</td>
<td dir="rtl">
  رمز التحقق الخاص بك
</td>
<td>
  Planned notification (Plan 13), channel-verify-code: subject line. Not
  in code yet.<br>
  [DIGIT] The code and "10" in Western digits.<br>
  [GENDER] "لا تشاركه" masculine imperative.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:channel-verify-code.body</code><br>
  2026-11-26-plan-13-channels.md:636
</td>
<td>
  Your verification code is {code}. It expires in 10 minutes. Do not share
  it.
</td>
<td dir="rtl">
  رمز التحقق هو {code}. ينتهي خلال 10 دقائق. لا تشاركه مع أحد.
</td>
<td>
  Planned notification (Plan 13), channel-verify-code: body (email,
  in-app, WhatsApp template).
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:TEMPLATE_TERMS.subject.expense-claim</code><br>
  2026-11-26-plan-13-channels.md:579
</td>
<td>
  expense claim
</td>
<td dir="rtl">
  مطالبة مصروفات
</td>
<td>
  Planned term spliced into notification templates (Plan 13).<br>
  [TERM] "مطالبة مصروفات" (expense claim) vs "طلب استرداد مصروفات".
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN14:meeting-invited.subject</code><br>
  2026-11-26-plan-14-meetings.md:610
</td>
<td>
  Meeting invitation from {organiser}
</td>
<td dir="rtl">
  دعوة اجتماع من {organiser}
</td>
<td>
  Planned notification (Plan 14), meeting-invited: subject.<br>
  [BIDI] {date} and {time} in RTL; "(بتوقيت الإمارات)" time zone claim.<br>
  [GENDER] "دعاك" masculine addressee.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN14:meeting-invited.body</code><br>
  2026-11-26-plan-14-meetings.md:610
</td>
<td>
  {organiser} invited you to a meeting on {date} at {time} (UAE time). Open
  the app for details and the calendar file.
</td>
<td dir="rtl">
  دعاك {organiser} إلى اجتماع يوم {date} الساعة {time} (بتوقيت الإمارات).
  افتح التطبيق للتفاصيل وملف التقويم.
</td>
<td>
  Planned notification (Plan 14), meeting-invited: body.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN14:meeting-cancelled.subject</code><br>
  2026-11-26-plan-14-meetings.md:612
</td>
<td>
  Meeting cancelled
</td>
<td dir="rtl">
  تم إلغاء الاجتماع
</td>
<td>
  Planned notification (Plan 14), meeting-cancelled: subject.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN14:meeting-cancelled.body</code><br>
  2026-11-26-plan-14-meetings.md:610
</td>
<td>
  {organiser} cancelled the meeting on {date}.
</td>
<td dir="rtl">
  ألغى {organiser} الاجتماع المقرر يوم {date}.
</td>
<td>
  Planned notification (Plan 14), meeting-cancelled: body.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN14:meeting-items-ready.subject</code><br>
  2026-11-26-plan-14-meetings.md:613
</td>
<td>
  Meeting notes ready to review
</td>
<td dir="rtl">
  ملاحظات الاجتماع جاهزة للمراجعة
</td>
<td>
  Planned notification (Plan 14), meeting-items-ready: subject.<br>
  [CLAIM] "لن تصبح أي منها مهمة قبل أن تؤكدها" is a promise about system
  behaviour; make sure it is true.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN14:meeting-items-ready.body</code><br>
  2026-11-26-plan-14-meetings.md:614
</td>
<td>
  Proposed notes and action items from your meeting on {date} are ready.
  Nothing becomes a task until you confirm it.
</td>
<td dir="rtl">
  الملاحظات والمهام المقترحة من اجتماعك يوم {date} جاهزة. لن تصبح أي منها
  مهمة قبل أن تؤكدها.
</td>
<td>
  Planned notification (Plan 14), meeting-items-ready: body.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN7:LETTER_LABELS.date</code><br>
  2026-11-26-plan-7-documents.md:1141
</td>
<td>
  Date
</td>
<td dir="rtl">
  التاريخ
</td>
<td>
  Planned letter label (Plan 7): date line of an HR letter.<br>
  [BIDI] Followed by an ISO date (YYYY-MM-DD) in the letter body.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN7:LETTER_LABELS.ref</code><br>
  2026-11-26-plan-7-documents.md:1142
</td>
<td>
  Reference
</td>
<td dir="rtl">
  المرجع
</td>
<td>
  Planned letter label (Plan 7): reference line.
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN17:currency-symbol</code><br>
  2026-11-26-plan-17-assistant-import-intranet.md:588
</td>
<td>
  AED
</td>
<td dir="rtl">
  د.إ
</td>
<td>
  Planned money parsing: accepts the Arabic currency abbreviation (Plan
  17).<br>
  [DIGIT] "د.إ" vs "درهم" vs "AED" (see PLAN7:formatMoney.ar).
</td>
<td>
  <b>MEDIUM</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:inbound-received.subject</code><br>
  2026-11-26-plan-13-channels.md:632
</td>
<td>
  Forwarded email to review
</td>
<td dir="rtl">
  بريد محوّل للمراجعة
</td>
<td>
  Planned notification (Plan 13), inbound-received: subject line. Not in
  code yet.<br>
  [TERM] "بريد محوّل" for forwarded email.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:inbound-received.body</code><br>
  2026-11-26-plan-13-channels.md:632
</td>
<td>
  A forwarded email is waiting in the review inbox.
</td>
<td dir="rtl">
  يوجد بريد محوّل بانتظار المراجعة في صندوق الوارد.
</td>
<td>
  Planned notification (Plan 13), inbound-received: body (email, in-app,
  WhatsApp template).
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:webhook-paused.subject</code><br>
  2026-11-26-plan-13-channels.md:633
</td>
<td>
  A webhook was paused
</td>
<td dir="rtl">
  تم إيقاف ويب هوك
</td>
<td>
  Planned notification (Plan 13), webhook-paused: subject line. Not in
  code yet.<br>
  [TERM] "ويب هوك" transliteration of webhook; "نقطة" for endpoint.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN13:webhook-paused.body</code><br>
  2026-11-26-plan-13-channels.md:633
</td>
<td>
  A webhook endpoint was paused after repeated failed deliveries. Open the
  developer settings to check it.
</td>
<td dir="rtl">
  تم إيقاف نقطة ويب هوك بعد تكرار فشل الإرسال. افتح إعدادات المطورين للتحقق.
</td>
<td>
  Planned notification (Plan 13), webhook-paused: body (email, in-app,
  WhatsApp template).
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN17:import-headers</code><br>
  2026-11-26-plan-17-assistant-import-intranet.md:445
</td>
<td>
  employee number, Arabic name (import column headers)
</td>
<td dir="rtl">
  رقم الموظف، الاسم بالعربي
</td>
<td>
  Planned CSV import header synonyms (Plan 17). Matching only; the user
  never reads them as UI text.<br>
  [GULF] Other common headers (الرقم الوظيفي, اسم الموظف) would match
  more files.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
<tr>
<td>
  <code>PLAN17:injection-phrase</code><br>
  2026-11-26-plan-17-assistant-import-intranet.md:1644
</td>
<td>
  ignore ... instructions
</td>
<td dir="rtl">
  تجاهل ... التعليمات
</td>
<td>
  Planned prompt-injection detector phrase (Plan 17). Matching only, not
  shown.<br>
  [GULF] Many other imperative forms exist (أهمل, تخطَّ, انسَ). Security
  wordlist, not user text.
</td>
<td>
  <b>LOW</b>
</td>
<td></td>
</tr>
</table>

## 6. Appendix A: Arabic in tests and fixtures

Not product text, but wording-coupled: a correction in section 5 will break the
tests marked WORDING, and they must be updated with it. Lines are from the
scanner.

- apps/web/e2e/smoke.spec.ts:14 [WORDING] await page.getByRole("button", {
  name: "العربية" }).click();
- apps/web/src/i18n/amount-input.ts:4 [TECHNICAL] const EASTERN_DIGIT =
  /[\u0660-\u0669\u06f0-\u06f9]/g;
- apps/web/src/i18n/amount-input.ts:6 [TECHNICAL] const ARABIC_DECIMAL =
  /\u066b/g;
- apps/web/src/i18n/amount-input.ts:8 [TECHNICAL] const THOUSANDS =
  /[,\u066c]/g;
- apps/web/tests/unit/amount-input.test.ts:6 [TECHNICAL]
  expect(parseAmountInput("١٠٠٠٠٫٥٠")).toBe(1000050n);
- apps/web/tests/unit/amount-input.test.ts:7 [TECHNICAL]
  expect(parseAmountInput("۱۰۰۰۰٫۵")).toBe(1000050n);
- apps/web/tests/unit/amount-input.test.ts:9 [TECHNICAL]
  expect(parseAmountInput("١٠٬٠٠٠")).toBe(1000000n);
- apps/web/tests/unit/format.test.ts:15 [TECHNICAL] .toBe("<U+2066>AED
  38,333.33<U+2069>");
- apps/web/tests/unit/format.test.ts:22 [TECHNICAL]
  expect(ar).not.toMatch(/[٠-٩]/);
- apps/web/tests/unit/sha256.test.ts:11 [TECHNICAL] "x".repeat(1000), "سارة
  علي <U+2066>AED<U+2069>"]) {
- packages/api/tests/employees.test.ts:115 [DATA] { nameAr: "العمليات" });
- packages/api/tests/employees.test.ts:116 [DATA]
  expect(u.body.nameAr).toBe("العمليات");
- packages/engine/tests/cli.test.ts:83 [WORDING] for (const ar of ["المجموع
  المحسوب", "غير محسوب", "بدل الإنذار",
- packages/engine/tests/cli.test.ts:84 [WORDING] "الخصومات", "المستحقات
  الأخرى", "افتراضي", "قبل:", "بعد:",
- packages/engine/tests/cli.test.ts:85 [WORDING] "الفرق:"]) {
- packages/engine/tests/cli.test.ts:88 [WORDING]
  expect(r.out).toContain("<U+2066>AED 1,666.67<U+2069>");
- packages/engine/tests/explain.test.ts:60 [WORDING]
  expect(ar).toContain("رسمي");
- packages/engine/tests/explain.test.ts:61 [WORDING]
  expect(ar).toContain("\u2066AED 35,000.00\u2069");
- packages/engine/tests/explain.test.ts:85 [WORDING] expect(g).toContain("لا
  تنطبق");
- packages/engine/tests/explain.test.ts:86 [WORDING]
  expect(g).toContain("المعاشات");
- packages/engine/tests/explain.test.ts:87 [WORDING]
  expect(g).toContain("(رسمي).");
- packages/engine/tests/explain.test.ts:97 [WORDING] expect(ar).toContain("غير
  مستحقة");
- packages/engine/tests/explain.test.ts:106 [WORDING]
  expect(explainTrace(settle(), "ar")).not.toContain("النهائية");
- packages/engine/tests/explain.test.ts:110 [WORDING]
  expect(ar).toContain("اختيار النظام");
- packages/engine/tests/explain.test.ts:111 [WORDING]
  expect(ar).not.toMatch(/(^|[ (،,])عرف([ ),.،]|$)/m);
- packages/engine/tests/explain.test.ts:121 [WORDING] "اختيار النظام");
- packages/engine/tests/payroll-explain.test.ts:86 [WORDING]
  .toContain("<U+2066>AED 15,000.00<U+2069>");
- packages/engine/tests/payroll-messages.test.ts:82 [WORDING]
  expect(PAYROLL_AR["cap.base"]).not.toContain("المعتمد");
- packages/engine/tests/payroll-messages.test.ts:83 [WORDING]
  expect(PAYROLL_AR["cap.overall"]).not.toContain("نصف");
- packages/engine/tests/payroll-overrides.test.ts:52 [WORDING]
  expect(explainTrace(ot, "ar")).toContain("قيمة مستبدلة");
- packages/wps/tests/format.test.ts:55 [TECHNICAL]
  expect(isAscii("شركة")).toBe(false);
- packages/wps/tests/generate.test.ts:178 [TECHNICAL] expect(codeOf({
  ...batch, reference: "\u0634\u0631\u0643\u0629" }))
- packages/wps/tests/records.test.ts:89 [TECHNICAL] const r = codeOf(() =>
  scrLine({ ...scr, reference: "شركة" }, L));
- packages/wps/tests/records.test.ts:90 [TECHNICAL] expect(r).toEqual({ code:
  "FIELD_NOT_ASCII", value: "شركة" });
- packages/wps/tests/records.test.ts:100 [TECHNICAL] const both = "شركة,x";
- packages/wps/tests/records.test.ts:104 [TECHNICAL]
  expect(ref("ش".repeat(40)).code).toBe("FIELD_NOT_ASCII");
- packages/wps/tests/validate.test.ts:92 [TECHNICAL] ["NON_ASCII", "error",
  set(4, 10, "abc شركة"), 4, 10],

Notes on the technical entries: `packages/wps` tests use Arabic only to
prove that WPS files reject non-ASCII text; `amount-input` tests feed
Arabic-Indic digits; `format.test.ts` and `sha256.test.ts` use bidi
isolates around money. None of them is user-facing.

## 7. Appendix B: Arabic in docs and the ledger

Scanner inventory of docs/superpowers/plans and LEDGER.md. Plan 5 copies the
engine payslip text and is partly stale: its cap.base, cap.overall and
leave.sick wording differs from the shipped code (the code is the version to
review; the plan-5 build report records the changes M7 and the removal of
"معتمد"). Rows for the planned copy in plans 4, 7, 13, 14 and 17 are in Area G.

- LEDGER.md:151 modelled; Arabic status words are joined with "," instead of
  "،".
- plans/2026-11-25-plan-2-wps-sif.md:78 `isAscii("شركة")` false.
- plans/2026-11-26-plan-13-channels.md:579 exactly: `subject.expense-claim`
  ("expense claim", "مطالبة
- plans/2026-11-26-plan-13-channels.md:580 مصروفات"), `outcome.approved`
  ("approved", "تمت الموافقة عليها"),
- plans/2026-11-26-plan-13-channels.md:581 `outcome.rejected` ("rejected", "تم
  رفضها"), `outcome.returned`
- plans/2026-11-26-plan-13-channels.md:582 ("returned for changes", "أعيدت
  للتعديل"), `provider.google`
- plans/2026-11-26-plan-13-channels.md:626 "موافقة بانتظارك: {subject}" / "طلب
  منك {requester} الموافقة على:
- plans/2026-11-26-plan-13-channels.md:627 {subject}. افتح التطبيق
  لمراجعتها."; "{subject} الخاصة بك
- plans/2026-11-26-plan-13-channels.md:628 {outcome}" / "{subject} الخاصة بك
  {outcome}. افتح التطبيق للتفاصيل.";
- plans/2026-11-26-plan-13-channels.md:629 "طلب إجازة من {requester}" / "طلب
  {requester} إجازة من {start} إلى
- plans/2026-11-26-plan-13-channels.md:630 {end}. افتح التطبيق لمراجعته."; "تم
  البت في إجازتك" / "إجازتك من
- plans/2026-11-26-plan-13-channels.md:631 {start} إلى {end} {outcome}.";
  "قسيمة راتبك جاهزة" / "قسيمة راتبك
- plans/2026-11-26-plan-13-channels.md:632 لشهر {period} جاهزة في التطبيق.";
  "بريد محوّل للمراجعة" / "يوجد بريد
- plans/2026-11-26-plan-13-channels.md:633 محوّل بانتظار المراجعة في صندوق
  الوارد."; "تم إيقاف ويب هوك" / "تم
- plans/2026-11-26-plan-13-channels.md:634 إيقاف نقطة ويب هوك بعد تكرار فشل
  الإرسال. افتح إعدادات المطورين
- plans/2026-11-26-plan-13-channels.md:635 للتحقق."; "تمت إضافة طريقة دخول
  جديدة" / "تم ربط تسجيل دخول
- plans/2026-11-26-plan-13-channels.md:636 {provider} بحسابك. إن لم تكن أنت،
  أبلغ المسؤول فورًا."; "رمز التحقق
- plans/2026-11-26-plan-13-channels.md:637 الخاص بك" / "رمز التحقق هو {code}.
  ينتهي خلال 10 دقائق. لا تشاركه
- plans/2026-11-26-plan-13-channels.md:638 مع أحد."
- plans/2026-11-26-plan-13-channels.md:859 the app or by replying STOP.", ar:
  "أوافق على أن ترسل لي {company}
- plans/2026-11-26-plan-13-channels.md:860 رسائل عمل عبر واتساب، مثل طلبات
  الموافقة والإشعارات، على الرقم
- plans/2026-11-26-plan-13-channels.md:861 أدناه. تمر الرسائل عبر خدمة واتساب
  التابعة لشركة Meta. يمكنني
- plans/2026-11-26-plan-13-channels.md:862 الإيقاف في أي وقت من التطبيق أو
  بالرد بكلمة STOP.", arReviewed:
- plans/2026-11-26-plan-14-meetings.md:610 drafts (NEEDS NATIVE REVIEW): "دعوة
  اجتماع من {organiser}" / "دعاك
- plans/2026-11-26-plan-14-meetings.md:611 {organiser} إلى اجتماع يوم {date}
  الساعة {time} (بتوقيت الإمارات).
- plans/2026-11-26-plan-14-meetings.md:612 افتح التطبيق للتفاصيل وملف
  التقويم."; "تم إلغاء الاجتماع" / "ألغى
- plans/2026-11-26-plan-14-meetings.md:613 {organiser} الاجتماع المقرر يوم
  {date}."; "ملاحظات الاجتماع جاهزة
- plans/2026-11-26-plan-14-meetings.md:614 للمراجعة" / "الملاحظات والمهام
  المقترحة من اجتماعك يوم {date}
- plans/2026-11-26-plan-14-meetings.md:615 جاهزة. لن تصبح أي منها مهمة قبل أن
  تؤكدها." Titles never go into a
- plans/2026-11-26-plan-14-meetings.md:1005 REVIEW): "تسجيل هذا الاجتماع"; "لا
  يمكن تسجيل هذا الاجتماع إلا إذا
- plans/2026-11-26-plan-14-meetings.md:1006 وافق جميع الحاضرين. صوتك من
  بياناتك الشخصية. يمكنك الرفض والانضمام
- plans/2026-11-26-plan-14-meetings.md:1007 مع ذلك."; "تسجيل صوت هذا الاجتماع.
  لا يتم تسجيل الفيديو أو الشاشات
- plans/2026-11-26-plan-14-meetings.md:1008 أبدًا."; "تحويل التسجيل إلى نص
  مكتوب عبر مزود التفريغ النصي
- plans/2026-11-26-plan-14-meetings.md:1009 لدينا."; "استخدام مزود النموذج
  اللغوي لدينا لإعداد مسودة ملاحظات
- plans/2026-11-26-plan-14-meetings.md:1010 ومهام مقترحة من النص. يجب أن يؤكد
  شخص كل مهمة قبل أن تصبح مهمة
- plans/2026-11-26-plan-14-meetings.md:1011 فعلية."; "يمكنك سحب موافقتك في أي
  وقت. إذا سحبت موافقتك على التسجيل
- plans/2026-11-26-plan-14-meetings.md:1012 يتوقف التسجيل ويُحذف تسجيل هذا
  الاجتماع وكل ما نتج عنه للجميع.";
- plans/2026-11-26-plan-14-meetings.md:1013 "تحتفظ شركتك بالتسجيلات والنصوص
  لمدة {days} يومًا ثم تحذفها."
- plans/2026-11-26-plan-14-meetings.md:1015 recorded. Audio only.", ar: "جارٍ
  التسجيل. وافق جميع الحاضرين على
- plans/2026-11-26-plan-14-meetings.md:1016 التسجيل. الصوت فقط.", arReviewed:
  false }`.
- plans/2026-11-26-plan-14-meetings.md:1250 U+0640; map أ إ آ to ا, ى to ي, ة
  to ه; lower-case Latin; drop
- plans/2026-11-26-plan-14-meetings.md:1282 `normalizeForWer("إجتماعُ الغدِ")`
  deep-equals `["اجتماع",
- plans/2026-11-26-plan-14-meetings.md:1283 "الغد"]`; "Meeting, at 10!" equals
  "meeting at 10" after normalizing;
- plans/2026-11-26-plan-14-meetings.md:1284 `isCodeSwitched("نرسل report
  بكرة")` is true; fast-check: `wer` of a
- plans/2026-11-26-plan-17-assistant-import-intranet.md:445 "staff id","رقم
  الموظف"]`); `suggestMapping(kind, headers):
- plans/2026-11-26-plan-17-assistant-import-intranet.md:496 -
  `suggest_mapping`: headers `["Emp No","Full Name","الاسم بالعربي",
- plans/2026-11-26-plan-17-assistant-import-intranet.md:588 `readMoney(s)`
  strips a leading `AED` or `د.إ` and spaces,
- plans/2026-11-26-plan-17-assistant-import-intranet.md:1628 optional `AED` or
  `د.إ`, digits with optional thousands commas,
- plans/2026-11-26-plan-17-assistant-import-intranet.md:1644 and "تجاهل" near
  "التعليمات"; "you are now" or "act as"; a line starting
- plans/2026-11-26-plan-17-assistant-import-intranet.md:2201 and tatweel
  removed, `أ إ آ` to `ا`, `ى` to `ي`, split on
- plans/2026-11-26-plan-4-web-app.md:91 placeholder is "HR and Payroll" /
  "الموارد البشرية والرواتب"
- plans/2026-11-26-plan-4-web-app.md:118 - An amount typed with Arabic-Indic
  digits ("١٠٠٠٠٫٥٠"), thousands
- plans/2026-11-26-plan-4-web-app.md:427 3833333n), "ar")` is `"<U+2066>AED
  38,333.33<U+2069>"`; en has no
- plans/2026-11-26-plan-4-web-app.md:1006 (`"١٠٠٠٠٫٥٠"` gives 1000050n;
  `"10,000.50"` gives 1000050n;
- plans/2026-11-26-plan-4-web-app.md:1144 `"<U+2066>AED 35,000.00<U+2069>"` in
  Arabic); › `pay-line-wording`
- plans/2026-11-26-plan-4-web-app.md:1149 `convention` reads "اختيار النظام").
- plans/2026-11-26-plan-4-web-app.md:1276 value under `wps` contains "مطابق"
  or "معتمد" (NEEDS NATIVE
- plans/2026-11-26-plan-4-web-app.md:1278 scanned in Arabic because "معتمد"
  also means an approved run)).
- plans/2026-11-26-plan-4-web-app.md:1297 (basic "١٠٠٠٠" gives the same
  total); › `pre-2022-leaver-refused`
- plans/2026-11-26-plan-4-web-app.md:1386 (`"١٢٣٤٥٦٧٨٩٠١٢٣"` saves as
  `1234567890123`);
- plans/2026-11-26-plan-5-monthly-payroll.md:968 AR فترة الراتب من
  {in.payStart} إلى {in.payEnd}:
- plans/2026-11-26-plan-5-monthly-payroll.md:969 {result} يومًا R
- plans/2026-11-26-plan-5-monthly-payroll.md:973 AR الحصة المدفوعة من الشهر
  بأنصاف الأيام: {result}
- plans/2026-11-26-plan-5-monthly-payroll.md:974 ({in.unpaidDays} أيام بدون
  أجر، {in.halfPayDays}
- plans/2026-11-26-plan-5-monthly-payroll.md:975 أيام بنصف أجر) R
- plans/2026-11-26-plan-5-monthly-payroll.md:978 AR الإجازة المرضية هذا الشهر:
  {in.fullPay} أيام بأجر
- plans/2026-11-26-plan-5-monthly-payroll.md:979 كامل، {in.halfPay} بنصف أجر،
  {in.unpaid} بدون أجر R
- plans/2026-11-26-plan-5-monthly-payroll.md:982 AR إجازة الوضع هذا الشهر:
  {in.fullPay} أيام بأجر كامل،
- plans/2026-11-26-plan-5-monthly-payroll.md:983 {in.halfPay} بنصف أجر،
  {in.unpaid} بدون أجر R
- plans/2026-11-26-plan-5-monthly-payroll.md:985 AR الراتب الأساسي عن الفترة:
  {result} R
- plans/2026-11-26-plan-5-monthly-payroll.md:987 AR البدل {in.code}: {result}
  R
- plans/2026-11-26-plan-5-monthly-payroll.md:990 AR أجر العمل الإضافي،
  {in.minutes} دقيقة: {result} R
- plans/2026-11-26-plan-5-monthly-payroll.md:994 AR أجر العمل الإضافي الليلي
  (من 22:00 إلى 04:00)،
- plans/2026-11-26-plan-5-monthly-payroll.md:995 {in.minutes} دقيقة: {result}
  R
- plans/2026-11-26-plan-5-monthly-payroll.md:998 AR أجر العمل في أيام الراحة
  ({in.days} مدفوعة،
- plans/2026-11-26-plan-5-monthly-payroll.md:999 {in.daysOff} أيام راحة
  بديلة): {result} R
- plans/2026-11-26-plan-5-monthly-payroll.md:1002 AR أجر العمل في العطلات
  الرسمية ({in.days} مدفوعة،
- plans/2026-11-26-plan-5-monthly-payroll.md:1003 {in.daysOff} أيام راحة
  بديلة): {result} R
- plans/2026-11-26-plan-5-monthly-payroll.md:1006 AR بدل نقدي عن الإجازة
  السنوية، {in.days} أيام:
- plans/2026-11-26-plan-5-monthly-payroll.md:1009 AR إجمالي الراتب: {result} R
- plans/2026-11-26-plan-5-monthly-payroll.md:1012 AR راتب حساب الاشتراك
  (المحدد في {in.fixingMonth}):
- plans/2026-11-26-plan-5-monthly-payroll.md:1017 AR حصة صاحب العمل في
  الاشتراك قبل دعم الحكومة:
- plans/2026-11-26-plan-5-monthly-payroll.md:1022 AR الجزء الذي تتحمله الحكومة
  من حصة صاحب العمل:
- plans/2026-11-26-plan-5-monthly-payroll.md:1025 AR الأجر المعتمد لحدود
  الخصم: {result} R
- plans/2026-11-26-plan-5-monthly-payroll.md:1028 AR أقصى ما يجوز خصمه هذا
  الشهر (نصف الأجر): {result} R
- plans/2026-11-26-plan-5-monthly-payroll.md:1030 AR اشتراك المعاش، حصة
  الموظف: {result} R
- plans/2026-11-26-plan-5-monthly-payroll.md:1032 AR استرداد مبلغ مدفوع
  بالزيادة {in.ref}: {result} R
- plans/2026-11-26-plan-5-monthly-payroll.md:1034 AR خصم بسبب مخالفة {in.ref}:
  {result} R
- plans/2026-11-26-plan-5-monthly-payroll.md:1036 AR خصم بسبب إتلاف {in.ref}:
  {result} R
- plans/2026-11-26-plan-5-monthly-payroll.md:1038 AR خصم بموجب حكم قضائي
  {in.ref}: {result} R
- plans/2026-11-26-plan-5-monthly-payroll.md:1041 AR خصم لصالح نظام ادخار أو
  رعاية {in.ref}: {result} R
- plans/2026-11-26-plan-5-monthly-payroll.md:1044 AR سداد قرض {in.ref}:
  {result} R
- plans/2026-11-26-plan-5-monthly-payroll.md:1046 AR مجموع الخصومات: {result}
  R
- plans/2026-11-26-plan-5-monthly-payroll.md:1048 AR صافي الراتب: {result} R
- plans/2026-11-26-plan-5-monthly-payroll.md:1050 AR اشتراك المعاش المستحق على
  صاحب العمل: {result} R
- plans/2026-11-26-plan-5-monthly-payroll.md:1052 AR تكلفة صاحب العمل فوق
  إجمالي الراتب: {result} R
- plans/2026-11-26-plan-6-expenses.md:1054 - `csv_arabic`: `"مطعم"`
  round-trips unchanged.
- plans/2026-11-26-plan-7-documents.md:654 code points;
  `contentDisposition("جواز.pdf")` equals `attachment;
- plans/2026-11-26-plan-7-documents.md:972 ar `"4,000.00 درهم"` (`// NEEDS
  NATIVE REVIEW`); dates stay ISO
- plans/2026-11-26-plan-7-documents.md:1046 \b/i`; no Arabic starter string
  contains `المادة`, `قانون`, `مرسوم`,
- plans/2026-11-26-plan-7-documents.md:1047 `ملزم`, `توقيع` or `وزارة`; each
  Arabic starter's `placeholders` set
- plans/2026-11-26-plan-7-documents.md:1141 en `{ date: "Date", ref:
  "Reference" }`, ar `{ date: "التاريخ",
- plans/2026-11-26-plan-7-documents.md:1142 ref: "المرجع" }` (`// NEEDS NATIVE
  REVIEW`). `dateLine` =
- plans/2026-11-26-plan-7-documents.md:1185 (`"Sample Employee"`, `"عينة
  موظف"`, `"4000.00"`, joining date
- plans/plan-5-build-report.md:50 (Arabic "نظام معتمد") became "Deduction for
  a savings or welfare
- plans/plan-5-build-report.md:51 scheme" ("نظام ادخار أو رعاية"), to keep
  approval words out of product
- plans/plan-5-build-report.md:100 the plan's "الأجر المعتمد" ("the wage used
  as the base"), which can
- plans/plan-5-build-report.md:152 print "overridden" (Arabic "قيمة مستبدلة",
  NEEDS NATIVE REVIEW).
- plans/plan-5-build-report.md:172 - M7: Arabic `cap.base` is now "الأجر الذي
  تُحسب عليه حدود الخصم"

## 8. Regenerating and checking this pack

```
node docs/review/scan-arabic.mjs            # every Arabic line, with file:line
node docs/review/scan-arabic.mjs --summary  # counts by area and file
node docs/review/scan-arabic.mjs --format tsv > /tmp/arabic.tsv
node docs/review/scan-arabic.mjs --check docs/review/arabic-review-pack.md
```

The last command exits 1 and prints MISSING lines when the repo holds Arabic
that is not in this pack (a new or changed string). Add the new rows to the
right area table, or update the changed text, then run it again. Risk ratings,
contexts and flags are written by hand; the scanner only proves completeness.
When a row's source line moves, update its file:line.

## 9. Reviewer sign-off

Native reviewer name: ______________________________

Dialect and region (for example UAE Gulf Arabic): ____________________

Date: ______________   Signature: ______________________________

Areas fully reviewed (tick): A [ ]  B [ ]  C [ ]  D [ ]  E [ ]  F [ ]  G [ ]

Open questions raised by the reviewer: ______________________________

Until this block is complete, the product must not show Arabic to employees.
