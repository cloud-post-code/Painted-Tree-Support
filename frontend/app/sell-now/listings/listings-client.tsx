"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ExternalLink,
  LayoutGrid,
  Mail,
  MapPin,
  Palette,
  Phone,
  ShoppingBag,
  Sparkles,
  Store,
  UserRoundSearch,
  UtensilsCrossed,
  Wrench,
} from "lucide-react";
import { apiUrl, readResponseBodyJson } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trackEvent } from "@/lib/analytics";
import { useCurrentUser } from "@/lib/use-current-user";

export type Listing = {
  id: number;
  type: string;
  brand_or_space_name: string;
  location_city: string;
  location_state: string;
  cost_tier: string;
  availability_text: string;
  description?: string | null;
  contact_email?: string;
  contact_phone?: string | null;
  website_url?: string | null;
  category?: string | null;
  hero_image_url?: string | null;
};

const COST_LABELS: Record<string, string> = {
  free: "Free",
  reduced: "Reduced",
  market: "Market rate",
};

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  food: "Food & beverage",
  retail: "Retail / goods",
  crafts: "Arts & crafts",
  services: "Services / venue",
  beauty: "Beauty & wellness",
};

function categoryLucide(cat: string | null | undefined): LucideIcon {
  switch ((cat || "general").toLowerCase()) {
    case "food":
      return UtensilsCrossed;
    case "retail":
      return ShoppingBag;
    case "crafts":
      return Palette;
    case "services":
      return Wrench;
    case "beauty":
      return Sparkles;
    default:
      return LayoutGrid;
  }
}

function typeLucide(listingType: string): LucideIcon {
  return listingType === "booth_offer" ? Store : UserRoundSearch;
}

function ListingBoardCard({ listing, showCostTier }: { listing: Listing; showCostTier: boolean }) {
  const [heroBroken, setHeroBroken] = useState(false);
  const CatIcon = categoryLucide(listing.category);
  const TypeIcon = typeLucide(listing.type);
  const hero =
    listing.hero_image_url && !heroBroken ? listing.hero_image_url : null;
  const tier = COST_LABELS[listing.cost_tier] || listing.cost_tier;
  const catLabel = CATEGORY_LABELS[listing.category || "general"] || listing.category || "General";
  const typeLabel = listing.type === "booth_offer" ? "Space available" : "Seeking space";
  const locationLine = `${listing.location_city}, ${listing.location_state}`;

  return (
    <article className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
      <div className="relative aspect-[16/10] bg-gradient-to-br from-[var(--vrr-teal)]/25 to-[var(--vrr-cream)]">
        {hero ? (
          <img
            src={hero}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setHeroBroken(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <CatIcon className="h-16 w-16 text-[var(--vrr-teal)]/55" aria-hidden />
          </div>
        )}
        <div
          className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-white/95 px-2 py-1 text-xs font-medium text-black/80 shadow-sm"
          title={catLabel}
        >
          <CatIcon className="h-3.5 w-3.5 shrink-0 text-[var(--vrr-teal)]" aria-hidden />
          {catLabel}
        </div>
        <div
          className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white"
          title={typeLabel}
        >
          <TypeIcon className="h-3 w-3" aria-hidden />
          {listing.type === "booth_offer" ? "Booth" : "Vendor"}
        </div>
      </div>
      <div className="space-y-2 p-4 text-sm">
        <h3 className="text-base font-semibold leading-snug text-black">
          {listing.brand_or_space_name}
        </h3>
        {showCostTier ? <p className="text-black/70">{tier}</p> : null}
        <p className="text-black/65">{listing.availability_text}</p>
        {listing.description ? (
          <p className="text-black/55 line-clamp-3">{listing.description}</p>
        ) : null}
        <div className="space-y-1.5 border-t border-black/10 pt-3 text-black/80">
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-black/50" aria-hidden />
            <span>
              <span className="sr-only">Location: </span>
              {locationLine}
            </span>
          </p>
          {listing.contact_email ? (
            <a
              href={`mailto:${listing.contact_email}`}
              className="flex items-center gap-2 font-medium text-[var(--vrr-teal)] hover:underline"
            >
              <Mail className="h-4 w-4 shrink-0" aria-hidden />
              {listing.contact_email}
            </a>
          ) : null}
          {listing.contact_phone ? (
            <a
              href={`tel:${listing.contact_phone.replace(/\s/g, "")}`}
              className="flex items-center gap-2 hover:underline"
            >
              <Phone className="h-4 w-4 shrink-0 text-black/50" aria-hidden />
              {listing.contact_phone}
            </a>
          ) : null}
          {listing.website_url ? (
            <a
              href={listing.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-medium text-[var(--vrr-teal)] hover:underline"
            >
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
              Website
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ListingsClient() {
  const [booths, setBooths] = useState<Listing[]>([]);
  const [seekers, setSeekers] = useState<Listing[]>([]);
  const [msg, setMsg] = useState("");
  const { user, loading } = useCurrentUser();
  const isAuthed = !!user;

  const load = () => {
    void fetch(apiUrl("/api/v1/listings?type=booth_offer")).then(async (r) => {
      const j = await readResponseBodyJson<Listing[]>(r);
      if (Array.isArray(j)) setBooths(j);
    });
    void fetch(apiUrl("/api/v1/listings?type=vendor_seeking")).then(async (r) => {
      const j = await readResponseBodyJson<Listing[]>(r);
      if (Array.isArray(j)) setSeekers(j);
    });
  };

  useEffect(() => {
    load();
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const websiteRaw = ((fd.get("website_url") as string) || "").trim();
    const body: Record<string, unknown> = {
      type: fd.get("type"),
      brand_or_space_name: fd.get("brand_or_space_name"),
      location_city: fd.get("location_city"),
      location_state: fd.get("location_state"),
      cost_tier: fd.get("cost_tier"),
      availability_text: fd.get("availability_text"),
      contact_phone: (fd.get("contact_phone") as string)?.trim() || null,
      description: fd.get("description") || null,
      category: fd.get("category") || "general",
      website_url: websiteRaw || null,
      hcaptcha_token: null,
    };
    if (!isAuthed) {
      body.contact_email = fd.get("contact_email");
    }
    const r = await fetch("/api/bff/v1/listings", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readResponseBodyJson<{ detail?: string; id?: number }>(r);
    if (data === null) {
      setMsg(
        r.status >= 502
          ? "Service temporarily unavailable. Please try again in a few minutes."
          : "Could not submit listing.",
      );
      return;
    }
    if (!r.ok) {
      setMsg(data.detail || "Error");
      return;
    }
    trackEvent("listing_submit", data.id != null ? { id: data.id } : {});
    setMsg("Submitted — pending review. Thank you.");
    form.reset();
  }

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-2">
      <div>
        <h2 className="text-xl font-semibold">Available booths / spaces</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-1">
          {booths.map((b) => (
            <ListingBoardCard key={b.id} listing={b} showCostTier />
          ))}
        </div>
        {!booths.length && <p className="mt-4 text-sm text-black/50">No published listings yet.</p>}
      </div>
      <div>
        <h2 className="text-xl font-semibold">Vendors seeking space</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-1">
          {seekers.map((b) => (
            <ListingBoardCard key={b.id} listing={b} showCostTier />
          ))}
        </div>
        {!seekers.length && <p className="mt-4 text-sm text-black/50">No published listings yet.</p>}
      </div>
      <div className="lg:col-span-2">
        <h2 className="text-xl font-semibold">Post a listing</h2>
        {isAuthed && (
          <p className="mt-3 max-w-xl rounded-md bg-[var(--vrr-cream)] px-3 py-2 text-sm">
            Signed in as <strong>{user.email}</strong>. This listing will be linked to your account.
          </p>
        )}
        <form className="mt-4 grid max-w-xl gap-3" onSubmit={submit}>
          <div>
            <Label>Type</Label>
            <select name="type" className="mt-1 w-full rounded-lg border border-black/15 p-2" required>
              <option value="booth_offer">Booth / space available</option>
              <option value="vendor_seeking">Vendor seeking space</option>
            </select>
          </div>
          <div>
            <Label>Category</Label>
            <Input name="category" placeholder="Any category (optional)" className="mt-1" />
          </div>
          <div>
            <Label>Name / space</Label>
            <Input name="brand_or_space_name" required className="mt-1" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>City</Label>
              <Input name="location_city" required className="mt-1" />
            </div>
            <div>
              <Label>State</Label>
              <Input name="location_state" required maxLength={2} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Cost</Label>
            <select name="cost_tier" className="mt-1 w-full rounded-lg border border-black/15 p-2" required>
              <option value="free">Free</option>
              <option value="reduced">Reduced</option>
              <option value="market">Market rate</option>
            </select>
          </div>
          <div>
            <Label>Website (optional)</Label>
            <Input
              name="website_url"
              type="url"
              inputMode="url"
              placeholder="https://…"
              className="mt-1"
            />
            <p className="mt-1 text-xs text-black/55">
              If the page has a preview image (Open Graph), we will try to use it on the board after the listing is
              published.
            </p>
          </div>
          <div>
            <Label>Availability</Label>
            <Textarea name="availability_text" required className="mt-1" />
          </div>
          <div>
            <Label>Contact phone</Label>
            <Input name="contact_phone" type="tel" autoComplete="tel" placeholder="Optional" className="mt-1" />
          </div>
          {!isAuthed && !loading && (
            <div>
              <Label>Contact email</Label>
              <Input name="contact_email" type="email" required className="mt-1" />
            </div>
          )}
          <div>
            <Label>Description (optional)</Label>
            <Textarea name="description" className="mt-1" />
          </div>
          <Button type="submit">Submit</Button>
          {msg && <p className="text-sm">{msg}</p>}
        </form>
      </div>
    </div>
  );
}
