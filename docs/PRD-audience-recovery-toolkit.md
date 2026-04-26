# PRD: Audience recovery toolkit

## Summary

The audience recovery toolkit helps vendors reconnect with customers after a move or relaunch. The hub surfaces four tools as distinct cards; each card includes a clear path into the tool and a one-click action to copy a shareable link to that tool.

## Goals

- Reduce time to find the right asset (social copy, email, PDF kit, guides).
- Make it trivial to paste a correct deep link into DMs, email footers, or internal docs.
- Match the rest of the site visually (cards, typography, teal accents).

## Scope

| Tool | Route | Primary deliverable |
|------|--------|---------------------|
| Social captions | `/toolkit/social` | API-driven templates + per-template copy (body) |
| Email announcements | `/toolkit/email` | API-driven templates + per-template copy (body) |
| “We moved” messaging kit | `/toolkit/we-moved` | PDF download |
| Link-in-bio guide | `/toolkit/link-in-bio` | CMS guide (markdown) |

Out of scope for this PRD: authoring workflow in admin, analytics beyond existing template copy logging.

## User stories

1. As a vendor, I see all recovery tools on one page so I can choose without hunting the nav.
2. As a vendor, I copy a **link** to a specific tool from the hub so I can share it or save it.
3. As a vendor on social/email pages, I copy **ready-made text** for a template so I can paste into Instagram or Mailchimp.
4. As a vendor on the “we moved” page, I download the PDF kit.

## Functional requirements

### Hub (`/toolkit`)

- Show a short page title and subtitle (“Reconnect customers after you move or relaunch.”).
- Render **exactly four** tools, each as a **card** with: title, one-line description, primary CTA (“Open tool”) to the correct route, secondary action **Copy link** that writes the **absolute** URL for that route to the clipboard.
- Absolute URL must use the current browser origin in production/staging (no hardcoded Railway hostname in code).
- After a successful copy, give inline feedback (e.g. button label “Copied” for ~2s). Failed copy should fail silently or show a minimal error state (browser-dependent).

### Deep pages

- **Social / email:** Each template is a card; each card has **Copy** for the template body (markdown source as plain text is acceptable for clipboard).
- **We moved:** Keep PDF download; optional future: copy link on same pattern as hub.
- **Guides:** Unchanged content; back link to hub remains.

## Non-functional

- Hub card grid is responsive (1 col mobile, 2 tablet, 3 desktop where width allows).
- Client-only APIs (`navigator.clipboard`) live in client components; hub shell can stay a server component that renders a client grid.

## Acceptance criteria

- [ ] `/toolkit` shows four cards; each card matches one row in the scope table.
- [ ] “Open tool” navigates to the correct path without full page errors.
- [ ] “Copy link” puts `https://<current-host>/toolkit/...` on the clipboard for that tool.
- [ ] Social and email toolkit pages still load templates from the API and copy template text.
- [ ] No regression on we-moved PDF download or guide pages.

## Open questions

- Should hub “Copy link” log analytics like template copy? (Currently not required.)
- Should template copy strip markdown for plain-text pasting? (Current behavior: copy `body_md` as stored.)
