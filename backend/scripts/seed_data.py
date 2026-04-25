"""Seed demo content. Run: cd backend && PYTHONPATH=. python scripts/seed_data.py"""

import asyncio
import sys
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models import (
    Announcement,
    CommunityLink,
    EmergencyCashOption,
    Guide,
    LegalArticle,
    LegalOrg,
    Listing,
    Resource,
    SiteCounter,
    SiteSetting,
    Template,
    TriageStep,
    Vendor,
)


async def main() -> None:
    async with AsyncSessionLocal() as db:
        # Site settings
        settings = [
            ("discord_invite_url", "https://discord.gg/example"),
            ("discord_widget_id", ""),
            ("discord_channel_general", "https://discord.gg/example"),
            ("gofundme_url", "https://www.gofundme.com"),
            ("google_maps_embed_url", "https://www.google.com/maps/embed?pb=example"),
        ]
        for k, v in settings:
            row = (await db.execute(select(SiteSetting).where(SiteSetting.key == k))).scalar_one_or_none()
            if not row:
                db.add(SiteSetting(key=k, value=v))

        counters = [
            ("vendor_count", 24),
            ("resources_count", 42),
            ("spaces_offered", 3),
            ("services_offered", 5),
            ("vendors_helped", 12),
        ]
        for k, v in counters:
            row = (await db.execute(select(SiteCounter).where(SiteCounter.key == k))).scalar_one_or_none()
            if row:
                row.value = v
            else:
                db.add(SiteCounter(key=k, value=v))

        if not (await db.execute(select(Announcement).limit(1))).scalar_one_or_none():
            db.add(
                Announcement(
                    body="Welcome — we update this banner when new emergency programs launch.",
                    published=True,
                    dismissible=True,
                )
            )

        grant_titles = [
            ("Small Business Emergency Grant", "CA"),
            ("Downtown Recovery Fund", "NY"),
            ("Market Vendor Relief", None),
            ("Microenterprise Bridge Grant", "TX"),
            ("Food Vendor Safety Net", None),
            ("Arts & Crafts Stabilization", "OR"),
            ("Neighborhood Market Fund", "IL"),
            ("Pop-up Recovery Stipend", "FL"),
            ("Vendor Fee Waiver Pool", "WA"),
            ("Community Commerce Grant", "CO"),
            ("Winter Market Support", "MN"),
        ]
        for i, (title, st) in enumerate(grant_titles):
            exists = (
                await db.execute(select(Resource).where(Resource.title == title, Resource.category == "grant"))
            ).scalar_one_or_none()
            if exists:
                continue
            db.add(
                Resource(
                    title=title,
                    summary="Short description — replace with verified copy.",
                    url=f"https://example.org/grants/{i}",
                    category="grant",
                    state=st,
                    published=True,
                    sort_order=i,
                    eligibility_summary="Small vendors displaced from physical markets.",
                    application_url=f"https://example.org/grants/{i}/apply",
                )
            )

        for i in range(5):
            t = f"Featured resource #{i + 1}"
            if (await db.execute(select(Resource).where(Resource.title == t, Resource.category == "featured"))).scalar_one_or_none():
                continue
            db.add(
                Resource(
                    title=t,
                    summary="Curated link for the homepage strip.",
                    url=f"https://example.org/featured/{i}",
                    category="featured",
                    published=True,
                    sort_order=i,
                )
            )

        for i in range(3):
            t = f"Emergency bridge fund #{i + 1}"
            if (
                await db.execute(select(Resource).where(Resource.title == t, Resource.category == "emergency_fund"))
            ).scalar_one_or_none():
                continue
            db.add(
                Resource(
                    title=t,
                    summary="Fast-turnaround bridge funding.",
                    url=f"https://example.org/emergency/{i}",
                    category="emergency_fund",
                    published=True,
                    sort_order=i,
                )
            )

        if not (await db.execute(select(TriageStep).limit(1))).scalar_one_or_none():
            steps = [
                ("Pause and list what you control today.", "Take 30 minutes. Write down cash on hand, inventory location, and who owes you money."),
                ("Secure or move inventory safely.", "Photograph stock, note serial numbers, and move high-value items to safe storage."),
                ("Notify customers with one honest message.", "Post where they already follow you — say you are relocating and where to find updates."),
                ("File time-sensitive claims within 48 hours.", "Insurance, landlord deposit, or marketplace claims often have short windows."),
                ("Pick one income channel to stand up this week.", "Use our Where to Sell Now guides — Etsy, Shopify, or social commerce."),
                ("Join the community for peer support.", "You are not alone — vendors share leads on booths and pop-ups."),
            ]
            for pos, (title, body) in enumerate(steps, start=1):
                db.add(TriageStep(position=pos, title=title, body_md=body, published=True))

        if not (await db.execute(select(EmergencyCashOption).limit(1))).scalar_one_or_none():
            db.add_all(
                [
                    EmergencyCashOption(
                        name="Local mutual aid rapid fund",
                        what_it_is="Neighbor-funded micro-grants for rent and food.",
                        who_qualifies="Vendors in the metro area with documented stall closure.",
                        url="https://example.org/mutual-aid",
                        est_time_to_funds="1–3 days",
                        sort_order=1,
                    ),
                    EmergencyCashOption(
                        name="SBA disaster-style bridge (example)",
                        what_it_is="Government-style bridge loan information (example link).",
                        who_qualifies="Businesses with EIN and prior year tax return.",
                        url="https://example.org/sba",
                        est_time_to_funds="2–6 weeks",
                        sort_order=2,
                    ),
                ]
            )

        guides = [
            (
                "etsy-setup",
                "etsy",
                "Etsy setup (10 steps)",
                "Account, first listing, pricing, shipping.",
                "## Step 1\nCreate your Etsy account.\n\n## Step 2\nOpen Shop and choose currency.\n\n## Step 3\nAdd a listing with clear photos.\n\n## Step 4\nSet fair shipping profiles.\n\n## Step 5\nPublish and share your shop link.",
                10,
            ),
            (
                "shopify-starter",
                "shopify",
                "Shopify Starter plan",
                "Domain, listing, payments on lowest tier.",
                "## Domain\nConnect or buy a domain.\n\n## Payments\nEnable Shopify Payments or PayPal.\n\n## Trial\nUse free trial while you validate demand.",
                6,
            ),
            (
                "instagram-shopping",
                "instagram",
                "Instagram Shopping",
                "Catalog and product tagging.",
                "## Catalog\nConnect Meta Commerce Manager.\n\n## Tagging\nTag products in posts and Reels.\n\n## Captions\nUse three sample captions from your toolkit page.",
                5,
            ),
            (
                "tiktok-shop",
                "tiktok",
                "TikTok Shop for small sellers",
                "Eligibility and setup overview.",
                "## Eligibility\nCheck region and category rules on TikTok Seller Center.\n\n## Setup\nConvert to business and apply for TikTok Shop.",
                4,
            ),
            (
                "linktree-setup",
                "linktree",
                "Link-in-bio (Linktree free tier)",
                "Multiple selling links in one page.",
                "## Create\nSign up at linktr.ee.\n\n## Links\nAdd Etsy, Instagram, email signup, and Discord.\n\n## Share\nPut the link in bio everywhere.",
                5,
            ),
            (
                "carrd-landing",
                "carrd",
                "One-page site on Carrd",
                "Under one hour.",
                "## Template\nPick a simple one-column layout.\n\n## Sections\nHero, products, contact.\n\n## Publish\nConnect custom domain later.",
                4,
            ),
        ]
        for slug, platform, title, summary, body, sc in guides:
            if (await db.execute(select(Guide).where(Guide.slug == slug))).scalar_one_or_none():
                continue
            db.add(
                Guide(slug=slug, platform=platform, title=title, summary=summary, body_md=body, steps_count=sc, published=True)
            )

        if not (await db.execute(select(CommunityLink).limit(1))).scalar_one_or_none():
            db.add_all(
                [
                    CommunityLink(name="#general", channel_url="https://discord.gg/example", sort_order=1),
                    CommunityLink(name="#inventory-recovery", channel_url="https://discord.gg/example", sort_order=2),
                ]
            )

        cats = ["jewelry", "food", "clothing", "art", "beauty", "home", "other"]
        for i in range(22):
            name = f"Demo Vendor {i + 1}"
            if (await db.execute(select(Vendor).where(Vendor.brand_name == name))).scalar_one_or_none():
                continue
            db.add(
                Vendor(
                    brand_name=name,
                    category=cats[i % len(cats)],
                    city="Portland",
                    state=["OR", "CA", "NY", "TX", "FL"][i % 5],
                    bio_150="We relocated after our market closed. Shop our new links!",
                    shop_links=[{"label": "Shop", "url": "https://example.org"}],
                    submitted_email=f"vendor{i}@example.com",
                    status="published",
                    featured=i == 0,
                )
            )

        now = datetime.now(UTC)
        if (
            await db.execute(select(LegalArticle).where(LegalArticle.slug == "bankruptcy"))
        ).scalar_one_or_none() is None:
            db.add(
                LegalArticle(
                    slug="bankruptcy",
                    title="Chapter 7 basics for vendors",
                    body_md="## Overview\nEducational summary only.\n\n## Timeline\nTypical cases take months — consult counsel.\n\n## Decision tree\nIf you cannot restructure, discuss Chapter 7 with an attorney.",
                    category="bankruptcy",
                    published=True,
                    review_signed_off_at=now,
                    reviewer_name="Demo Attorney (replace)",
                )
            )
        if (
            await db.execute(select(LegalArticle).where(LegalArticle.slug == "creditor-claim"))
        ).scalar_one_or_none() is None:
            db.add(
                LegalArticle(
                    slug="creditor-claim",
                    title="Filing a creditor claim",
                    body_md="## Steps\n1. Find the case on PACER.\n2. Complete proof of claim.\n3. File before the bar date.",
                    category="creditor_claim",
                    published=True,
                    review_signed_off_at=now,
                    reviewer_name="Demo Attorney (replace)",
                )
            )

        for i in range(12):
            if (
                await db.execute(select(LegalOrg).where(LegalOrg.name == f"Pro Bono Org {i + 1}"))
            ).scalar_one_or_none():
                continue
            db.add(
                LegalOrg(
                    name=f"Pro Bono Org {i + 1}",
                    type="pro_bono",
                    states=[["CA", "NY", "TX", "FL", "OR"][i % 5]],
                    areas_of_practice=["bankruptcy", "contracts"],
                    website=f"https://example.org/probono/{i}",
                    sort_order=i,
                )
            )
        for i in range(16):
            if (
                await db.execute(select(LegalOrg).where(LegalOrg.name == f"Legal Aid {i + 1}"))
            ).scalar_one_or_none():
                continue
            db.add(
                LegalOrg(
                    name=f"Legal Aid {i + 1}",
                    type="legal_aid",
                    states=[["CA", "WA", "IL", "MN", "CO"][i % 5]],
                    areas_of_practice=["landlord", "contracts", "bankruptcy"],
                    website=f"https://example.org/legalaid/{i}",
                    sort_order=i + 20,
                )
            )

        captions = [
            ("We are back — new links in bio!", "social_caption", "instagram", "casual"),
            ("Our booth moved — same great goods.", "social_caption", "instagram", "formal"),
            ("Support our comeback — shop small today.", "social_caption", "tiktok", "urgent"),
            ("New location, same heart. Thank you.", "social_caption", "facebook", "casual"),
            ("Pop-up schedule posted — see stories.", "social_caption", "instagram", "casual"),
        ]
        for title, kind, ch, tone in captions:
            if (await db.execute(select(Template).where(Template.title == title))).scalar_one_or_none():
                continue
            db.add(Template(kind=kind, title=title, body_md=f"**{title}**\n\nCopy and edit for your brand.", channel=ch, tone=tone))

        emails = [
            ("Email — formal relocation", "email", None, "formal"),
            ("Email — casual update", "email", None, "casual"),
            ("Email — urgent fundraiser", "email", None, "urgent"),
        ]
        for title, kind, ch, tone in emails:
            if (await db.execute(select(Template).where(Template.title == title))).scalar_one_or_none():
                continue
            db.add(
                Template(
                    kind=kind,
                    title=title,
                    body_md=f"Subject: We moved\n\nBody: {title}\n\n— Your name",
                    channel=ch,
                    tone=tone,
                )
            )

        if not (await db.execute(select(Listing).limit(1))).scalar_one_or_none():
            db.add(
                Listing(
                    type="booth_offer",
                    brand_or_space_name="Riverside Weekend Market",
                    location_city="Austin",
                    location_state="TX",
                    cost_tier="reduced",
                    availability_text="Two 10x10 spots opening June",
                    contact_email="ops@example.org",
                    status="published",
                )
            )

        await db.commit()
    print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(main())
