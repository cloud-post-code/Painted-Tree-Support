"use client";

import { useState } from "react";
import { VendorImageUpload } from "@/components/vendor-image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readResponseBodyJson } from "@/lib/api";
import { useCurrentUser } from "@/lib/use-current-user";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "jewelry", label: "Jewelry" },
  { value: "food", label: "Food" },
  { value: "clothing", label: "Clothing" },
  { value: "art", label: "Art" },
  { value: "beauty", label: "Beauty" },
  { value: "home", label: "Home" },
  { value: "other", label: "Other" },
];

export default function VendorSubmitPage() {
  const [msg, setMsg] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const { user, loading } = useCurrentUser();
  const isAuthed = !!user;

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Submit your vendor profile</h1>
      <p className="mt-2 text-sm text-black/70">
        Only <strong>brand name</strong> is required. Location, bio, category, and shop links are optional; you can add
        details later. Profiles are reviewed before going live.
      </p>
      {isAuthed && (
        <p className="mt-3 rounded-md bg-[var(--vrr-cream)] px-3 py-2 text-sm">
          Signed in as <strong>{user.email}</strong>. This profile will be linked to your account.
        </p>
      )}
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const brand = String(fd.get("brand_name") || "").trim();
          if (!brand) {
            setMsg("Please enter a brand name.");
            return;
          }
          const shop_links: { label: string; url: string }[] = [];
          const online = String(fd.get("shop_online_url") || "").trim();
          const inPerson = String(fd.get("shop_inperson_url") || "").trim();
          if (online) shop_links.push({ label: "Shop online", url: online });
          if (inPerson) shop_links.push({ label: "Shop in person", url: inPerson });
          const body: Record<string, unknown> = {
            brand_name: brand,
            category: String(fd.get("category") || "").trim() || "other",
            city: String(fd.get("city") || "").trim() || null,
            state: String(fd.get("state") || "").trim().toUpperCase().slice(0, 8) || null,
            bio_150: String(fd.get("bio_150") || "").trim() || null,
            address_line1: String(fd.get("address_line1") || "").trim() || null,
            address_line2: String(fd.get("address_line2") || "").trim() || null,
            postal_code: String(fd.get("postal_code") || "").trim() || null,
            phone: String(fd.get("phone") || "").trim() || null,
            fax: String(fd.get("fax") || "").trim() || null,
            contact_name: String(fd.get("contact_name") || "").trim() || null,
            contact_email: String(fd.get("contact_email") || "").trim() || null,
            shop_links,
            logo_url: logoUrl,
            banner_url: bannerUrl,
            hcaptcha_token: null,
          };
          if (!isAuthed) {
            body.submitted_email = fd.get("submitted_email");
          }
          const r = await fetch("/api/bff/v1/vendors", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await readResponseBodyJson<{ detail?: string }>(r);
          if (data === null) {
            setMsg(
              r.status >= 502
                ? "Service temporarily unavailable. Please try again in a few minutes."
                : "Could not submit. Please try again.",
            );
            return;
          }
          setMsg(r.ok ? "Received — pending review." : data.detail || "Error");
        }}
      >
        <div>
          <Label htmlFor="brand_name">Brand name</Label>
          <Input id="brand_name" name="brand_name" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="category">Category (optional)</Label>
          <select id="category" name="category" className="mt-1 w-full rounded-lg border p-2" defaultValue="other">
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="city">City (optional)</Label>
            <Input id="city" name="city" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="state">State (optional)</Label>
            <Input id="state" name="state" maxLength={8} className="mt-1" placeholder="TX" />
          </div>
        </div>
        <div>
          <Label htmlFor="address_line1">Street address line 1</Label>
          <Input id="address_line1" name="address_line1" className="mt-1" autoComplete="address-line1" />
        </div>
        <div>
          <Label htmlFor="address_line2">Street address line 2</Label>
          <Input id="address_line2" name="address_line2" className="mt-1" autoComplete="address-line2" />
        </div>
        <div>
          <Label htmlFor="postal_code">ZIP / postal code</Label>
          <Input id="postal_code" name="postal_code" className="mt-1" autoComplete="postal-code" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" className="mt-1" autoComplete="tel" />
          </div>
          <div>
            <Label htmlFor="fax">Fax</Label>
            <Input id="fax" name="fax" type="tel" className="mt-1" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="contact_name">Contact name</Label>
            <Input id="contact_name" name="contact_name" className="mt-1" autoComplete="name" />
          </div>
          <div>
            <Label htmlFor="contact_email">Business contact email</Label>
            <Input id="contact_email" name="contact_email" type="email" className="mt-1" autoComplete="email" />
            <p className="mt-1 text-xs text-black/50">
              Optional public email for customers. Your submission / account email stays private unless you choose to
              match this field.
            </p>
          </div>
        </div>
        <div>
          <Label htmlFor="bio_150">Short bio (optional, max 160 characters)</Label>
          <Textarea id="bio_150" name="bio_150" maxLength={160} className="mt-1" rows={3} />
          <p className="mt-1 text-xs text-black/50">
            Shown on your public card when provided; a longer description can be added after approval.
          </p>
        </div>
        <div className="rounded-lg border border-black/10 bg-black/[0.02] p-4 space-y-6">
          <p className="text-sm font-medium text-black/80">Images (optional)</p>
          <VendorImageUpload kind="logo" value={logoUrl} onChange={setLogoUrl} />
          <VendorImageUpload kind="banner" value={bannerUrl} onChange={setBannerUrl} />
        </div>
        {!isAuthed && !loading && (
          <div>
            <Label htmlFor="submitted_email">Your email (for updates)</Label>
            <Input id="submitted_email" name="submitted_email" type="email" required className="mt-1" />
          </div>
        )}
        <div className="rounded-lg border border-black/10 bg-black/[0.02] p-4 space-y-4">
          <p className="text-sm font-medium text-black/80">Where customers can find you</p>
          <div>
            <Label htmlFor="shop_online_url">Where you sell online</Label>
            <Input
              id="shop_online_url"
              name="shop_online_url"
              type="url"
              inputMode="url"
              placeholder="https://yourshop.com or social profile"
              className="mt-1"
            />
            <p className="mt-1 text-xs text-black/50">Website, Etsy, Instagram shop, etc. Leave blank if not applicable.</p>
          </div>
          <div>
            <Label htmlFor="shop_inperson_url">Where you sell in person</Label>
            <Input
              id="shop_inperson_url"
              name="shop_inperson_url"
              type="url"
              inputMode="url"
              placeholder="https://maps… or event / market link"
              className="mt-1"
            />
            <p className="mt-1 text-xs text-black/50">Google Maps pin, market schedule, or retail location. Leave blank if not applicable.</p>
          </div>
        </div>
        <Button type="submit">Submit</Button>
        {msg && <p className="text-sm">{msg}</p>}
      </form>
    </div>
  );
}
