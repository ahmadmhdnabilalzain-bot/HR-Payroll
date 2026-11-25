# Website Insights: Feasibility (25 Nov 2026)

One researcher, eight searches, snippet level. UNVERIFIED means check the
official page before relying on it.

## Options

| Option | How it connects | Limits and cost (as found) | Notes |
|---|---|---|---|
| Google Analytics 4 Data API | Customer signs in with Google OAuth, scope `analytics.readonly` | Standard properties: 200,000 core tokens per property per day, 40,000 per hour, 10 concurrent requests (official quotas page). Cost not checked (generally free, UNVERIFIED) | Google OAuth verification: sensitive scopes about 3 to 5 business days with a demo video; restricted scopes add a security assessment. Whether `analytics.readonly` is sensitive or restricted was not confirmed; check the consent screen |
| Search Console API | Google OAuth | Query limits per site and project (translated snippet, verify) | Only search queries, clicks and impressions; no application funnel |
| Plausible, Fathom, Matomo, PostHog | Customer pastes an API key or site id (no OAuth review) | Paid from about $9 to $29 per month (sources disagree, UNVERIFIED); PostHog is usage-based with a free tier | Simpler than Google but one connector per tool |
| Our own tracking snippet plus UTM tags | Snippet on careers and job pages; UTM on every social link; events on application start and completion | None | Most direct way to tie a social post to an application; privacy design needed |

## Competitors

Workable has a candidate-source report (UTM links appear under "Other");
Greenhouse uses source tokens on tracking links; Zoho Recruit markets
candidate-source and job-posting performance. None surfaced in these searches
as showing traffic from the customer's own website. UAE HR vendors: not found.

## Privacy points to check (not legal conclusions)

- Cookies or a visitor id versus cookieless aggregate-only tracking.
- IP address handling, lawful basis, retention, who is controller and who is
  processor, and whether the customer's cookie notice covers our snippet.
- Linking visitor sessions to applicant records turns them into candidate data.
- PDPL (Federal Decree-Law 45 of 2021): transfer rules (Articles 22 and 23)
  matter for tools that send visitor data outside the UAE (GA4 and similar).
  Whether the detailed regulations are issued is disputed; check the UAE Data
  Office. DIFC and ADGM have their own laws.

## Suggested order (a bet)

1. First-party snippet plus UTM tagging (no third-party approval, best
   attribution), designed cookieless or aggregate by default.
2. GA4 connector (check Google verification early).
3. Plausible or PostHog connectors on demand.
