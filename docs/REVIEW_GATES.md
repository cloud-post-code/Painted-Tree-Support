# Review gates (PRD launch checklists)

## Phase 1 — before Phase 2

- [ ] Homepage (PRD-001) deployed; 4 CTAs and hero verified at 375 / 768 / 1280.
- [ ] Immediate help (PRD-002): PDF downloads; triage + emergency cash cards populated.
- [ ] Sell now (PRD-004): Etsy, Shopify, Instagram, TikTok guides published; listings form → pending → publish flow works.
- [ ] Community (PRD-008): Discord invite site-wide; widget optional via `discord_widget_id`.
- [ ] Disclaimers on crisis triage, immediate help, community pages.
- [ ] GA4 / Hotjar env vars set; `cta_click`, `pdf_download`, `discord_join`, `listing_submit`, `external_link_click` verified in DebugView.
- [ ] External link checker (`node scripts/check_external_links.mjs`) green against staging API.
- [ ] SME content review per major section.

## Phase 2 — production

- [ ] Vendor directory: ≥20 published profiles; search/filters; admin publish.
- [ ] Legal center: attorney sign-off on articles before `published=true`.
- [ ] Toolkit: templates + PDFs live.
- [ ] Help vendors: forms + Stripe **test** or GoFundMe until fiscal sponsor resolved.
- [ ] Listings boards accepting submissions.
- [ ] Trust: hCaptcha optional; domain blocklist configured if needed.

## Phase 3

See [Roadmap](/roadmap) — planning only; no release gate.
