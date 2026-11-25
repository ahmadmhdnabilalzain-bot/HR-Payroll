# Social Media Insights: Feasibility (25 Nov 2026)

Platforms: Instagram, TikTok, Snapchat, X, LinkedIn. Source: one researcher on
search snippets and secondary sources; no deep page reads. **UNVERIFIED**
means check the official docs before relying on it. "Not found" means not found
in these searches.

## Per platform

| Platform | Official API for insights | Access and approval | Cost | Key limits |
|---|---|---|---|---|
| Instagram | Instagram Platform insights (professional account) | Meta App Review with Advanced Access; Business Verification first; reported timelines range from days to weeks; strict | Free | `impressions` removed Apr 2025 (replaced by views); demographics need 100+ followers; some data delayed up to 48 hours |
| TikTok | Display API (per-user, limited) and TikTok for Business API (business accounts) | Approval needed; timelines UNVERIFIED | Free (as found) | Possibly no historical backfill (snapshot daily from connection); demographic availability conflicts across sources |
| Snapchat | Public Profile API under the Marketing API | Process not found; some insights can be shared publicly by the creator | Free (as found) | Data lag 1 to 2 days (third party); demographics UNVERIFIED |
| X | X API v2 post and user metrics | Self-serve developer account; owner authorises via OAuth | Pay-per-use credits by 2026 (about $0.005 per post read, third-party report); old Basic and Pro tiers closed to new signups | Private metrics (impressions, clicks) only for the owner's posts and only the last 30 days, so we must store them; deletion compliance expected |
| LinkedIn | Community Management API (Page analytics) | Company Page admin; Development tier first, then a Standard-tier request with a screen recording; **analytics-only upgrade requests are reportedly rejected**, so confirm with LinkedIn | Free | Terms on storing and caching data are strict (UNVERIFIED) |

## What exists already

- No UAE HR vendor was found offering social insights or employer-brand
  analytics in these searches (possible gap, UNVERIFIED).
- LinkedIn Talent Insights has an employer-brand tab (quote-based price).
- Zoho Social is a separate product, roughly US$10 to 40 per month.

## Aggregators (shortcut around per-platform reviews)

- Ayrshare: per-profile billing, business plans with minimum profile counts,
  supports Snapchat, posting plus analytics.
- Metricool API: only on higher plans (about US$67 to 77 per month, sources
  disagree). Zernio: pay per connected account (competitor-sourced figures).
- Phyllo: creator data, quote-only, not a posting API.
- A unified API still sits under each platform's terms and review rules, so
  storage rights, per-page cost and data residency must be checked.

## Decisions this needs from the owner (not blocking Plan 1)

1. Build direct platform integrations (several app reviews, weeks each, with
   LinkedIn the riskiest for an analytics-only product) or start with an
   aggregator (faster, per-page cost, inherited limits)?
2. Accept that X is pay-per-use and that private metrics are kept for only 30
   days unless we store them?
3. Order of platforms. A reasonable start: LinkedIn (hiring), Instagram,
   then the rest.
