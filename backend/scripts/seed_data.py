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
    ServiceOffer,
    SiteCounter,
    SiteSetting,
    SpaceOffer,
    Template,
    TriageStep,
    Vendor,
    Volunteer,
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

        grant_rows: list[tuple[str, str | None, str, str]] = [
            (
                "Small Business Emergency Grant",
                "CA",
                (
                    "One-time awards for microbusinesses with a storefront or booth history; "
                    "funds may cover inventory, rent, or equipment."
                ),
                (
                    "California-based sole props and LLCs under $500K annual revenue; "
                    "documentation of business closure or relocation."
                ),
            ),
            (
                "Downtown Recovery Fund",
                "NY",
                (
                    "Neighborhood grants for retailers and food vendors affected by construction, "
                    "vacancy, or disaster-related displacement."
                ),
                "NYC metro vendors with a lease or market stall agreement in the last 12 months.",
            ),
            (
                "Market Vendor Relief",
                None,
                (
                    "National pilot program (demo link) for open-air and indoor market sellers who "
                    "lost their stall assignment without notice."
                ),
                "Active sellers in any U.S. state with proof of prior market participation.",
            ),
            (
                "Microenterprise Bridge Grant",
                "TX",
                (
                    "Fast micro-grants for businesses with five or fewer employees bridging to a new "
                    "sales channel or location."
                ),
                "Texas-based microenterprises; priority for food, apparel, and handmade goods vendors.",
            ),
            (
                "Food Vendor Safety Net",
                None,
                (
                    "Reimbursement-style support for permitted food vendors for spoilage, permits, "
                    "and commissary transitions after closure."
                ),
                "Mobile and fixed food vendors with current or lapsed health permits in the last 18 months.",
            ),
            (
                "Arts & Crafts Stabilization",
                "OR",
                "Stipends for artists and makers to rebuild online presence, photography, and shipping workflows.",
                "Oregon residents selling original handmade work; portfolio or marketplace history accepted.",
            ),
            (
                "Neighborhood Market Fund",
                "IL",
                "Community-funded matching grants for vendors returning to pop-ups and farmers markets within 90 days.",
                "Illinois vendors referred by a market manager or BIA letter.",
            ),
            (
                "Pop-up Recovery Stipend",
                "FL",
                (
                    "Small stipends for booth fees, tents, and signage for vendors restarting at "
                    "festivals or parking-lot markets."
                ),
                "Florida vendors with a confirmed pop-up or event date.",
            ),
            (
                "Vendor Fee Waiver Pool",
                "WA",
                "Covers application and first-month fees at partner markets and co-retail spaces (demo program).",
                "Washington vendors displaced from a closed venue in the prior six months.",
            ),
            (
                "Community Commerce Grant",
                "CO",
                "Grants for vendors partnering with local nonprofits on bundled giveaways or mutual-aid pop-ups.",
                "Colorado small businesses with a community partner letter of support.",
            ),
            (
                "Winter Market Support",
                "MN",
                "Cold-weather market transition grants for heaters, tent upgrades, and indoor winter series fees.",
                "Minnesota outdoor market vendors with winter series acceptance or waitlist.",
            ),
        ]
        for i, (title, st, summary, eligibility) in enumerate(grant_rows):
            exists = (
                await db.execute(select(Resource).where(Resource.title == title, Resource.category == "grant"))
            ).scalar_one_or_none()
            if exists:
                continue
            db.add(
                Resource(
                    title=title,
                    summary=summary,
                    url=f"https://example.org/grants/{i}",
                    category="grant",
                    state=st,
                    published=True,
                    sort_order=i,
                    eligibility_summary=eligibility,
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
                "## Catalog\nConnect Meta Commerce Manager.\n\n## Tagging\nTag products in posts and Reels.\n\n## Captions\nDraft three short captions that highlight your products and call to action.",
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
                    CommunityLink(
                        name="Painted Tree Facebook group",
                        channel_url="https://www.facebook.com/groups/1482251463621586",
                        description="~3.7K members — community voices, resources, and information",
                        sort_order=0,
                    ),
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

        _u = "https://images.unsplash.com"
        listing_seeds: list[dict[str, str | None]] = [
            {
                "type": "booth_offer",
                "brand_or_space_name": "Riverside Weekend Market",
                "location_city": "Austin",
                "location_state": "TX",
                "cost_tier": "reduced",
                "availability_text": "Two 10x10 spots opening June",
                "contact_email": "ops@example.org",
                "contact_phone": None,
                "website_url": "https://ogp.me/",
                "category": "retail",
                "hero_image_url": f"{_u}/photo-1555529900-a56c90d6991a?w=800&q=80",
            },
            {
                "type": "booth_offer",
                "brand_or_space_name": "Harborview Night Market",
                "location_city": "Seattle",
                "location_state": "WA",
                "cost_tier": "market",
                "availability_text": "Four covered bays on Friday evenings; power available.",
                "contact_email": "harborview@example.org",
                "contact_phone": "206-555-0100",
                "website_url": "https://www.seattle.gov",
                "category": "services",
                "hero_image_url": f"{_u}/photo-1497366216548-37526070297c?w=800&q=80",
            },
            {
                "type": "booth_offer",
                "brand_or_space_name": "Midtown Makers Hall",
                "location_city": "Chicago",
                "location_state": "IL",
                "cost_tier": "reduced",
                "availability_text": (
                    "Shared retail wall + weekend table bundle for jewelry and small goods."
                ),
                "contact_email": "makershall@example.org",
                "contact_phone": None,
                "website_url": None,
                "category": "crafts",
                "hero_image_url": f"{_u}/photo-1452860606245-08befc0ff44b?w=800&q=80",
            },
            {
                "type": "vendor_seeking",
                "brand_or_space_name": "Bloom & Thread",
                "location_city": "Denver",
                "location_state": "CO",
                "cost_tier": "reduced",
                "availability_text": (
                    "Jewelry vendor seeking 8x8 or shared case near LoDo; available Tue–Sun."
                ),
                "contact_email": "hello@example.org",
                "contact_phone": None,
                "website_url": "https://ogp.me/",
                "category": "retail",
                "hero_image_url": f"{_u}/photo-1515377905703-c4788e51af15?w=800&q=80",
            },
            {
                "type": "vendor_seeking",
                "brand_or_space_name": "Spice Route Pop-Up",
                "location_city": "Miami",
                "location_state": "FL",
                "cost_tier": "free",
                "availability_text": "Packaged food vendor needs covered weekend spot; has all permits.",
                "contact_email": "spiceroute@example.org",
                "contact_phone": None,
                "website_url": "https://www.fda.gov/food",
                "category": "food",
                "hero_image_url": f"{_u}/photo-1546069901-ba9599a7e63c?w=800&q=80",
            },
        ]
        for seed in listing_seeds:
            typ = str(seed["type"])
            name = str(seed["brand_or_space_name"])
            city = str(seed["location_city"])
            exists = (
                await db.execute(
                    select(Listing).where(
                        Listing.type == typ,
                        Listing.brand_or_space_name == name,
                        Listing.location_city == city,
                    )
                )
            ).scalar_one_or_none()
            if exists:
                continue
            db.add(
                Listing(
                    type=typ,
                    brand_or_space_name=name,
                    location_city=city,
                    location_state=str(seed["location_state"]),
                    cost_tier=str(seed["cost_tier"]),
                    availability_text=str(seed["availability_text"]),
                    contact_email=str(seed["contact_email"]),
                    contact_phone=seed.get("contact_phone"),
                    website_url=seed.get("website_url"),
                    category=str(seed.get("category") or "general"),
                    hero_image_url=seed.get("hero_image_url"),
                    status="published",
                )
            )

        if not (await db.execute(select(SpaceOffer).limit(1))).scalar_one_or_none():
            db.add_all(
                [
                    SpaceOffer(
                        space_type="Indoor retail bay (10x10)",
                        location_city="Portland",
                        location_state="OR",
                        cost_tier="reduced",
                        availability_text=(
                            "Two bays free for first month for displaced market vendors; "
                            "rolling through fall."
                        ),
                        contact_email="spaces@example.org",
                        contact_phone="503-555-0142",
                        description="Shared loading dock and Wi‑Fi. Quiet hours before 10 a.m.",
                        status="published",
                        published_ack=True,
                    ),
                    SpaceOffer(
                        space_type="Parking-lot pop-up stall",
                        location_city="Phoenix",
                        location_state="AZ",
                        cost_tier="free",
                        availability_text="Sundays 9–2; shade structures provided.",
                        contact_email="events@example.org",
                        description="First-come setup from 7 a.m.; generator use restricted.",
                        status="published",
                        published_ack=True,
                    ),
                    SpaceOffer(
                        space_type="Co-op shelf + weekend table",
                        location_city="Minneapolis",
                        location_state="MN",
                        cost_tier="market",
                        availability_text="Waitlist for January; priority for handmade and pantry goods.",
                        contact_email="coop@example.org",
                        status="pending",
                        published_ack=False,
                    ),
                ]
            )

        if not (await db.execute(select(ServiceOffer).limit(1))).scalar_one_or_none():
            db.add_all(
                [
                    ServiceOffer(
                        service_type="legal",
                        availability="Pro bono clinics first Tuesday monthly; remote consults within 5 business days.",
                        cost_tier="pro_bono",
                        contact_email="legalclinic@example.org",
                        contact_phone="415-555-0199",
                        description="Contract review, lease questions, and creditor timelines for small vendors.",
                        status="published",
                        published_ack=True,
                    ),
                    ServiceOffer(
                        service_type="marketing",
                        availability="10 hours/month for three months; async Slack.",
                        cost_tier="reduced",
                        contact_email="studio@example.org",
                        description="Listing copy, basic photo edits, and one landing page for relaunch.",
                        status="published",
                        published_ack=True,
                    ),
                    ServiceOffer(
                        service_type="logistics",
                        availability="Regional pickup within 50 miles Wed/Sat.",
                        cost_tier="paid",
                        contact_email="haul@example.org",
                        description="Inventory moves from closed booths to storage or new venues.",
                        status="published",
                        published_ack=True,
                    ),
                    ServiceOffer(
                        service_type="tech",
                        availability="Evenings PT; Shopify/Etsy setup sprints.",
                        cost_tier="reduced",
                        contact_email="build@example.org",
                        description="Payments, shipping profiles, and DNS for simple storefronts.",
                        status="pending",
                        published_ack=False,
                    ),
                ]
            )

        if not (await db.execute(select(Volunteer).limit(1))).scalar_one_or_none():
            db.add_all(
                [
                    Volunteer(
                        name="Jordan Lee",
                        email="jordan.volunteer@example.com",
                        skills=["copywriting", "social media"],
                        availability="Weeknights after 6 p.m. ET",
                        areas_of_interest="Helping vendors rewrite bios and announcement posts",
                        status="published",
                    ),
                    Volunteer(
                        name="Sam Rivera",
                        email="sam.volunteer@example.com",
                        skills=["photography", "lightroom"],
                        availability="Saturdays in metro Denver",
                        areas_of_interest="Product shots for Etsy relaunches",
                        status="published",
                    ),
                    Volunteer(
                        name="Avery Kim",
                        email="avery.volunteer@example.com",
                        skills=["spreadsheets", "quickbooks"],
                        availability="Sunday afternoons",
                        areas_of_interest="Inventory spreadsheets and simple P&L templates",
                        status="pending",
                    ),
                ]
            )

        await db.commit()
    print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(main())
