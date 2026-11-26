# Discovery questions: first meeting with the bank (27 Nov 2026)

25 questions for the owner to ask, grouped by who answers best. Each has
the reason we ask. Ask the three marked "ask first" before or right after
step 1 of the click script; they decide what to stress.

The Keka points behind these questions come from public reviews and
Keka's own help pages. They are questions, not accusations: we have not
seen the bank's Keka setup, and Keka holds certifications we do not.

Write the answers down word for word where you can.

## For the HR Manager (1 to 10)

1. **Ask first.** What exactly fails in your current system today? The last time it went
   wrong, what happened, and what did it cost you (time, money, a staff
   complaint)?
   *Why:* "It cannot do the job properly" can mean wrong numbers, slow
   support or slow screens. Reviews show all three. We fix their problem,
   not a guess.

2. **Ask first.** Walk me through one month's payroll. Who touches it, how
   many days does it take, and where do you still use Excel?
   *Why:* shows where time goes and which checks are done by hand.

3. Which bank receives your salary file? Does it take the standard SIF,
   or a bank-specific format? Is the file made in your current system or by hand? Has one
   ever been rejected?
   *Why:* the file format is bank-specific in practice. Keka claims files
   for a few named banks only; we must know theirs before any promise.

4. How is gratuity worked out for you today: how many days a year, and on
   a 30-day or a 365-day basis? Has a settlement ever been questioned?
   *Why:* some Keka help pages show a 15-day example; the law sets 21
   days for the first five years. Let them compare with step 5.

5. Do leave, working hours or attendance rules differ by branch? Weekend
   days, shifts, Ramadan hours, public holidays, how staff clock in?
   *Why:* branch rules are where rigid setups break ("limited
   customisation" is a top Keka complaint).

6. Which allowances, overtime rules, bonuses and back pay do you run? Any
   payments outside the monthly run?
   *Why:* sets the pay elements we must support on day one.

7. Who decides leave, expenses, salary changes and the pay run? Who
   covers when that person is away?
   *Why:* approvals and bulk edits are a known Keka pain; we need their
   real chain to set up maker and checker.

8. Pension for UAE nationals: which fund do you pay today, at what rates,
   and on which salary (basic only, or more)?
   *Why:* the demo does not compute it. See the prepared answer below.

9. How do you handle salary advances, loans and other deductions?
   *Why:* deductions have legal limits; we show the cap in the demo and
   need their cases.

10. Do staff use your current system's mobile app? For what? What would they miss?
    *Why:* staff like Keka's app; our phone version is a website, with no
    native app yet. We need to know what matters most.

## For the General Manager (11 to 17)

11. **Ask first.** What does "a smarter system" mean to you? If one thing
    were fixed by next payroll, what would it be?
    *Why:* "smarter" can mean fewer errors, better reports or less manual
    work. We should not assume it means AI.

12. Which reports do you or the board ask for that HR builds by hand?
    *Why:* "inflexible reports" is a common Keka complaint; tells us which
    reports to have ready first.

13. What do you track on Emiratisation today, and who receives it?
    *Why:* the demo shows headcount by nationality only; the rules for
    banks are not confirmed on our side.

14. Which plan and add-ons of your current system do you pay for? When does the contract
    end, and how much notice must you give?
    *Why:* Keka's terms renew automatically unless notice is given 30
    days before the end, and data access lasts 30 days after it ends.
    Timing decides the migration plan.

15. Who decides, by when, and what would a trial or a parallel run (both
    systems for one or two months) need to prove?
    *Why:* tells us the next step and the bar to clear.

16. What would make a payroll mistake costly for the bank: a late salary,
    a wrong settlement, an audit finding? What do your auditors ask HR
    for?
    *Why:* shows which controls (sign-off, audit trail, explanations) to
    stress.

17. What do you expect from support during payroll week: hours, response
    time, a named person?
    *Why:* slow support is the most common Keka complaint. We should
    promise only what we can keep.

## For the IT Manager (18 to 25)

18. What does your regulator require for outsourcing and for where staff
    data is stored? Must it be in the UAE? Do you need approval before an
    outside system holds staff data?
    *Why:* unverified on our side and it decides hosting. We will not
    load real data until this is agreed.

19. What does your vendor security review need: a questionnaire,
    certifications, a penetration test report, a right to audit?
    *Why:* we hold none of SOC 2, ISO 27001 or a pen test today; we need
    to know what is required and by when.

20. Which sign-in provider do you use (Microsoft Entra ID, Google,
    other)? What MFA policy? How are joiners and leavers given and removed
    access?
    *Why:* single sign-on is built in our backend but not yet set up for a
    client.

21. Which systems need HR or payroll data from us: core banking, the
    general ledger, the directory, the service desk?
    *Why:* sets the integration list (API, webhooks, file exports).

22. What can you export from your current system today: pay registers, leave balances,
    gratuity accruals, documents, audit logs? How many years of history
    must we keep?
    *Why:* our Keka migration tool is not built; the exports decide the
    migration plan. Ask for exports before giving notice.

23. Which attendance devices do the branches use, and how do punches
    reach your current system today?
    *Why:* clock-in feeds are a common integration and a peak-hour pain
    in Keka reviews.

24. Who should see salaries? How long must the audit trail be kept? How
    often do you review who has access?
    *Why:* sets roles, retention and the access review.

25. Which devices and browsers will staff use (managed iPhones, Safari,
    Windows)? Any limits such as VPN, IP allow-lists or blocked sites?
    Who needs Arabic?
    *Why:* our phone version is a website; Arabic is hidden until a native
    speaker reviews it.

## Prepared answer: pension for UAE nationals in Abu Dhabi

Use this if they ask why the demo does not include pension, or after
question 8. Say it in your own words, but keep every point.

"The demo shows pension for UAE nationals as 'not computed', on purpose.
For UAE nationals employed in Abu Dhabi, a separate Abu Dhabi pension fund
may apply instead of the federal fund. We have not confirmed which fund
covers your staff, or the rates and salary base. We will confirm it with
the fund before any live payroll, and show you the source."

Do not quote a rate. Do not say which fund applies.
