# Channels feasibility (UAE): WhatsApp, email-in, calendar, SSO

Date of research: 2026-11-26. Method: Firecrawl scrape/search only, no
proxy or stealth options. Pages are served from Firecrawl cache in many
cases (cache dates noted where the tool gave them).

Evidence labels used below:
- READ = full page text returned and read.
- QUERY = Firecrawl extracted answer from the page (not full text read).
- EXCERPT = search-result snippet only.
- NOT FOUND = looked for it, official source did not state it / not
  reachable.

## Blocked or failed hosts

- business.whatsapp.com/products/platform-pricing: Firecrawl refused
  ("site not currently supported"). Used developers.facebook.com
  pricing page instead.
- scontent-*.fbcdn.net AED rate CSV (linked from Meta pricing page):
  scrape aborted, "document_antibot". Not retried with other options.
  So the AED per-message rate for the UAE is NOT FOUND.
- learn.microsoft.com/en-us/graph/webhooks: 404 (page moved).
- tdra.gov.ae/en/FAQs/marketing-short-message-service: returned a 404
  page. TDRA policy PDF linked from the initiative page was not read.
- No TLS or proxy-tunnel blocks occurred on the hosts above.

## 1. WhatsApp approvals and notifications

### What the official source says

- Pricing page (QUERY + grep of full saved text, "Updated: Nov 18,
  2026"): https://developers.facebook.com/documentation/business-
  messaging/whatsapp/pricing
  - Per-message pricing since July 1, 2025 (replaced conversation
    pricing). Charged by category and market, for business-to-user
    messages only. Categories: marketing, utility, authentication,
    service, Meta Business Agent.
  - United Arab Emirates (AE, +971) is listed as one of 47 markets.
  - Rate cards are in CSV/PDF files, effective Oct 1, 2026. An AED
    list-rate file exists (AED launched April 1, 2026). I could not
    open it. Actual UAE rates: NOT FOUND.
  - Utility and authentication have volume tiers (monthly, per market,
    per business portfolio).
  - Free: all message types inside a free entry point window (user
    comes from a click-to-WhatsApp ad or page CTA and you reply within
    the 24h window). Utility templates sent inside an open customer
    service window were stated as charged again (changelog section).
  - Service messages (free-form replies in the 24h window) became
    charged from Oct 1, 2026, with 1,000 free per business phone
    number per month, no rollover. Without a payment method, service
    messages beyond the free tier are not delivered.
- Template rules (READ): https://developers.facebook.com/documentation/
  business-messaging/whatsapp/templates/overview (updated May 21, 2026)
  - Templates are the only message type allowed outside the 24h
    customer service window. Categories: authentication, marketing,
    utility. Review is automatic; review "can take up to 24 hours".
  - Limit 250 templates per account if portfolio unverified; 6,000 if
    verified with an approved display name. 100 template creations/hour.
  - Templates can be paused or disabled on poor quality feedback;
    inactive 12 months leads to archival.
  - Meta does not translate; you supply each language (Arabic and
    English need separate templates).
- Opt-in (EXCERPT): https://developers.facebook.com/documentation/
  business-messaging/whatsapp/getting-opt-in
  - Business must obtain opt-in before messaging; may be general, not
    WhatsApp-specific, if it complies with local law. Must name the
    business and state the person is opting in.
- Messaging limits and verification (EXCERPT): .../whatsapp/
  messaging-limits and facebook.com/business/help/995114135706133
  - New portfolio starts at 250 unique users per rolling 24h for
    business-initiated messages; verification raises it (help page:
    2,000, then automatic scaling toward 100,000). Unverified: 2 phone
    numbers; verified: 20. Verified portfolios can display business
    name.
  - Replies inside the 24h window are unlimited.
- Availability to UAE businesses: NOT FOUND as an explicit statement.
  Evidence is indirect only: UAE is a priced market and AED billing
  exists. Meta country-of-business eligibility for verification and
  any sanctions or policy exclusions were not read. Confirm during
  verification.
- Lead time for business verification: NOT FOUND in pages read. Meta
  help page for verification (facebook.com/business/help/2058515294227817)
  was not read. Treat as days to weeks; unverified.

### Pricing as published (dated 2026-11-26)

- Structure published (Nov 18, 2026 page): per-message, by category.
- UAE AED rates: NOT FOUND (CSV blocked). Action: a human opens the
  AED CSV in a browser, or ask a BSP for a UAE quote.
- Service messages: 1,000 free/number/month, then charged (from Oct 1,
  2026).
- BSP markups (Twilio, 360dialog, etc.): not researched.

### Risks

- Per-user approvals mostly happen inside the 24h window only if the
  employee messaged first. Otherwise every approval ping needs an
  approved utility template and costs a message.
- Quality-based template pause and a 250/day cap before verification.
- Opt-in must be recorded per employee. UAE PDPL consent handling is
  covered in docs/research/2026-11-26-pdpl-primary.md (separate file).
- Payroll data in WhatsApp messages: keep to minimal text plus a link
  to the app. Do not send payslip amounts or IBANs. This is advice,
  not a sourced rule.
- Meta pricing changes with notice; model cost with a buffer.

### Recommended build approach (cheapest first)

1. Week 0: Create a Meta business portfolio, start business
   verification (long pole), and request AED rates from one BSP.
2. Week 1: Build against the Cloud API test number: one utility
   template ("Leave request from {{name}} awaiting your approval") with
   quick-reply buttons Approve / Reject, plus a webhook that verifies
   the sender and writes the decision to the audit log. Bilingual
   English and Arabic templates.
3. Make WhatsApp an optional channel; email and in-app stay the
   source of truth. Fall back to email on delivery failure.
4. Skip a BSP at first if the team can run Cloud API directly; use a
   BSP only if embedded signup for many customer tenants is needed
   (each customer's own WABA vs one shared number is a product
   decision, not researched here).

## 2. Email-in (forward invoices or claims to an address)

### What the official source says

- Postmark inbound webhook (READ): https://postmarkapp.com/developer/
  webhooks/inbound-webhook
  - Postmark accepts mail to an inbound address or your forwarding
    domain, parses it, and POSTs JSON (From, Subject, TextBody,
    HtmlBody, Attachments as base64, headers with SPF/DKIM/spam
    results, plus-address MailboxHash).
  - Non-200 response triggers 10 retries over about 10+ hours; a 403
    stops retries.
- Postmark pricing (QUERY, cached 2026-11-26): https://postmarkapp.com/
  pricing
  - Free $0, Basic $15/mo, Pro $16.50/mo, Platform $18/mo (starting
    prices; volume not captured). Inbound processing is NOT included
    in Free or Basic; included in Pro and Platform.
  - Data location statement: NOT FOUND on pricing page. Inbound
    attachment size limits: not read.
- Amazon SES receiving (READ): https://docs.aws.amazon.com/ses/latest/
  dg/receiving-email.html
  - Receipt rules can store mail to S3, notify via SNS, or call Lambda.
    Needs a Region that supports receiving.
- SES receiving Regions (QUERY): https://docs.aws.amazon.com/general/
  latest/gr/ses.html
  - Receiving is supported in Middle East (Bahrain) me-south-1, and
    in Europe, India, and others. UAE (me-central-1) was NOT in the
    receiving endpoint table as extracted. So in-country UAE inbound
    via SES is not available per this source; Bahrain is the nearest.
- SendGrid Inbound Parse (QUERY): https://www.twilio.com/docs/sendgrid/
  for-developers/parsing-email/setting-up-the-inbound-parse-webhook
  (modified 2026-10-08). EU/regional data options: NOT FOUND on page.
  MX setup, size limits and pricing: not extracted.

### Pricing as published

- Postmark: from $15/mo; inbound needs Pro tier ($16.50/mo starting),
  as of 2026-11-26.
- SES receiving price: NOT FOUND (pricing page not read).
- SendGrid inbound parse price: NOT FOUND.

### Data residency (UAE)

- No source read states UAE-resident inbound processing for any of the
  three. SES in me-south-1 (Bahrain) is the closest in region.
- UAE PDPL cross-border rules apply to employee personal data in
  forwarded claims; see the existing PDPL file in this folder, and
  decide with counsel. Not analysed here.

### Risks

- Spoofing: anyone can mail the address. Require a per-tenant
  plus-address token and match the sender to a known employee, and
  check SPF/DKIM results in the headers.
- Attachment handling: malware scanning, size limits, PDFs of invoices
  with personal data. OCR/extraction is a separate build.
- Provider holds mail in transit outside the UAE.

### Recommended build approach (cheapest first)

1. Cheapest: Postmark Pro or SES (Bahrain) with one shared inbound
   address per tenant (claims+TENANTTOKEN@in.example). Webhook stores
   raw payload and attachments in your own storage, then a queue job
   parses.
2. Put every parsed item in a "needs review" inbox. No auto-posting to
   payroll without a human approval.
3. If residency in region matters: SES me-south-1 with S3 + SNS, or
   self-hosted MX later. Confirm provider terms in writing.

## 3. Google and Microsoft calendar sync

### What the official source says

- Google Calendar scopes (READ): https://developers.google.com/workspace/
  calendar/api/auth (last updated 2026-09-03)
  - Scopes include calendar, calendar.readonly, calendar.events,
    calendar.events.readonly, calendar.freebusy, calendar.events.owned,
    calendar.app.created (secondary calendars only), calendarlist, and
    others. Page advises choosing the narrowest scope.
  - Sensitive/restricted classification of each scope is NOT stated on
    this page.
- Google verification (QUERY): https://developers.google.com/identity/
  protocols/oauth2/production-readiness/sensitive-scope-verification
  - "Sensitive scopes require review by Google before any Google
    Account can grant access." "...can take up to 10 days." CASA
    security assessment for restricted scopes: NOT FOUND on this page.
    Which Calendar scopes are sensitive: not confirmed by a page I
    read. Check the scope list in the OAuth console.
- Google push (EXCERPT): https://developers.google.com/workspace/
  calendar/api/guides/push
  - events.watch creates a webhook channel; channels expire and must
    be renewed; ttl default 604800 s (7 days) per the reference.
- Microsoft Graph permissions (QUERY): https://learn.microsoft.com/
  en-us/graph/permissions-reference (ms.date 2026-09-14)
  - Calendars.Read and Calendars.ReadWrite: admin consent required for
    Application permissions; not required for Delegated.
- Graph subscriptions (EXCERPT): https://learn.microsoft.com/en-us/graph/
  api/resources/subscription
  - Table excerpt did not list the Outlook event resource. A Microsoft
    Q&A thread (community, not official) says calendar/mail
    subscriptions expire after about 4230 minutes (under 3 days).
    Official figure for events: NOT FOUND in text read.
- Entra multitenant consent (EXCERPT): learn.microsoft.com/en-us/entra/
  identity-platform/howto-convert-app-to-be-multi-tenant. Admins can
  require admin consent for apps without a verified publisher (EXCERPT
  of architecture page). Publisher verification process and lead time:
  NOT FOUND.

### Pricing

- Google Calendar API and Microsoft Graph calendar: no per-call charge
  stated in pages read. Quotas: NOT FOUND.

### Risks

- Google review (up to 10 days per Google) plus app homepage, privacy
  policy and domain checks; unverified apps show a warning and user
  cap (cap not confirmed in what I read).
- Microsoft tenant admins may block user consent; unverified publisher
  apps may need admin consent.
- Sync loops, time zones (UAE has no DST; counterparts do), recurring
  events, and deletions.
- Webhook channels and subscriptions must be renewed on a schedule.

### Recommended build approach (cheapest first)

1. Cheapest and lowest-risk: one-way export. Publish leave, public
   holidays and pay dates as an ICS feed per user (secret URL). No
   OAuth, no review, works in Google, Outlook and Apple.
2. Next: write-only to a dedicated secondary calendar using
   calendar.app.created (Google) so a narrow scope applies; for
   Microsoft use delegated Calendars.ReadWrite with per-user consent.
3. Two-way read of user calendars (free/busy for leave conflicts) only
   when customers ask: start Google verification and Entra publisher
   verification in parallel at least a month before launch.

## 4. SSO (OIDC and SAML; Entra and Google Workspace)

### What the official source says

- Entra (EXCERPT): multitenant apps are registered in the developer
  tenant; each customer tenant consents; apps must validate the issuer
  and tid claim per tenant. URL for tenant-wide admin consent is
  login.microsoftonline.com/{org}/adminconsent?client_id=...
- Google (EXCERPT): https://developers.google.com/identity/openid-connect/
  openid-connect (Sign in with Google via OIDC). Google Workspace as a
  SAML IdP for custom apps: only a community thread surfaced; the
  official Workspace Admin Help page was NOT FOUND in this search.
- Library choice: no vendor page read. Names such as openid-client
  or Authlib (OIDC) and python3-saml / passport-saml (SAML) are from
  my general knowledge, not verified in this session. Verify licence
  and maintenance before choosing.

### Pricing

- Entra: SSO to a custom app needs no extra licence for the customer
  in basic cases (unverified here). Some features need Entra P1/P2.
  NOT FOUND in sources read.
- Google Workspace SAML custom app: edition requirements NOT FOUND.

### Risks

- SAML is where the pain is (certificate rotation, clock skew,
  signature validation bugs). Use a maintained library; never
  hand-roll XML signature checks.
- Account linking and just-in-time provisioning: tie to verified email
  and an immutable id (Entra oid/sub), not email alone.
- Payroll admin roles need step-up or MFA regardless of SSO.
- SCIM provisioning and offboarding: not researched.

### Recommended build approach (cheapest first)

1. Cheapest: OIDC only, with Google and Microsoft (multitenant Entra
   app, "common"/"organizations" endpoint) as "Sign in with" options.
   Gate by email domain claim, allow-list per tenant.
2. Add generic OIDC per customer (issuer URL, client id/secret) for
   other IdPs.
3. Add SAML later only on customer demand, via a maintained library
   or a managed broker, as an enterprise-tier feature.

## 5. UAE TDRA position on business messaging and sender registration

- Read (READ): https://tdra.gov.ae/en/initiatives/marketing-short-
  message-service (cached 2026-11-25). TDRA states it limits intrusive
  marketing SMS via a regulatory policy, encourages licensees to give
  subscribers easy opt-in and opt-out, monitors compliance and
  "mandates strict action against entities that send messages without
  prior consent". Links to an "Unsolicited Electronic Communications
  Regulatory Policy" (Arabic PDF, NOT READ) and a FAQ that returned 404.
- The TDRA FAQ search excerpt mentions blocking by texting a sender ID
  to 7726 (EXCERPT, not verified further).
- Sender ID registration rules for SMS: NOT FOUND (not stated on pages
  read; the policy PDF is unread).
- Anything about WhatsApp or OTT business messaging (non-SMS) from
  TDRA: NOT FOUND in pages read. Do not assume TDRA regulates it, or
  that it does not. Ask counsel; WhatsApp opt-in under Meta policy
  applies regardless.
- Implication: TDRA text is about SMS and marketing; HR approvals and
  payroll notices are transactional. This is an inference, not a
  quoted TDRA statement.

## Gaps list (all NOT FOUND or unverified)

1. UAE AED per-message WhatsApp rates (CSV blocked).
2. Meta business verification lead time and explicit UAE eligibility.
3. Postmark and SES data location for inbound; SES UAE receiving
   (absent from the Region table as extracted).
4. Google: which Calendar scopes are sensitive or restricted, CASA.
5. Graph: official max subscription lifetime for calendar events.
6. Entra publisher verification steps and timing.
7. Google Workspace SAML custom app official admin documentation.
8. TDRA sender ID rules, the policy PDF, and any WhatsApp/OTT stance.
9. SSO library vetting.
