"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiUrl } from "@/lib/api";

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
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Submit your vendor profile</h1>
      <p className="mt-2 text-sm text-black/70">
        Add one link where you sell online and one where you sell in person (both optional). You can add more links
        later by requesting an update. Profiles are reviewed before going live.
      </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const shop_links: { label: string; url: string }[] = [];
          const online = String(fd.get("shop_online_url") || "").trim();
          const inPerson = String(fd.get("shop_inperson_url") || "").trim();
          if (online) shop_links.push({ label: "Shop online", url: online });
          if (inPerson) shop_links.push({ label: "Shop in person", url: inPerson });
          const body = {
            brand_name: fd.get("brand_name"),
            category: fd.get("category"),
            city: fd.get("city"),
            state: fd.get("state"),
            bio_150: fd.get("bio_150"),
            shop_links,
            submitted_email: fd.get("submitted_email"),
            hcaptcha_token: null,
          };
          const r = await fetch(apiUrl("/api/v1/vendors"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await r.json();
          setMsg(r.ok ? "Received — pending review." : data.detail || "Error");
        }}
      >
        <div>
          <Label htmlFor="brand_name">Brand name</Label>
          <Input id="brand_name" name="brand_name" required className="mt-1" />
        </div>
        <div>
          <Label htmlFor="category">Category</Label>
          <select id="category" name="category" className="mt-1 w-full rounded-lg border p-2" required>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="state">State</Label>
            <Input id="state" name="state" maxLength={2} required className="mt-1" placeholder="TX" />
          </div>
        </div>
        <div>
          <Label htmlFor="bio_150">Short bio (directory listing, max 160 characters)</Label>
          <Textarea id="bio_150" name="bio_150" maxLength={160} required className="mt-1" rows={3} />
          <p className="mt-1 text-xs text-black/50">Shown on your public card; a longer description can be added after approval.</p>
        </div>
        <div>
          <Label htmlFor="submitted_email">Your email (for updates)</Label>
          <Input id="submitted_email" name="submitted_email" type="email" required className="mt-1" />
        </div>
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
