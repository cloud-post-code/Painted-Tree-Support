"use client";

import { useState } from "react";
import { VendorImageUpload } from "@/components/vendor-image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readResponseBodyJson } from "@/lib/api";
import { useCurrentUser } from "@/lib/use-current-user";

function splitCategories(raw: string): string[] {
  if (!raw) return [];
  const parts = raw
    .split(/[\n,|]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p.slice(0, 120));
    if (out.length >= 16) break;
  }
  return out;
}

export default function VendorSubmitPage() {
  const [msg, setMsg] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const { user, loading } = useCurrentUser();
  const isAuthed = !!user;

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Submit your vendor listing</h1>
      <p className="mt-2 text-sm text-black/70">
        Use the eight fields below (same names as our CSV template). Only <strong>Name</strong> is required.
        Listings are reviewed before going live.
      </p>
      {isAuthed && (
        <p className="mt-3 rounded-md bg-[var(--vrr-cream)] px-3 py-2 text-sm">
          Signed in as <strong>{user.email}</strong>. This listing will be linked to your account.
        </p>
      )}
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const name = String(fd.get("name") || "").trim();
          if (!name) {
            setMsg("Please enter a Name.");
            return;
          }
          const body: Record<string, unknown> = {
            name,
            categories: splitCategories(String(fd.get("categories") || "")),
            description: String(fd.get("description") || "").trim() || null,
            previousPtLocation: String(fd.get("previousPtLocation") || "").trim() || null,
            currentLocation: String(fd.get("currentLocation") || "").trim() || null,
            logoUrl,
            heroUrl,
            website: String(fd.get("website") || "").trim() || null,
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
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required className="mt-1" autoComplete="organization" />
        </div>
        <div>
          <Label htmlFor="categories">Categories</Label>
          <Textarea
            id="categories"
            name="categories"
            rows={3}
            className="mt-1"
            placeholder="One per line — or separate with | or commas. e.g.&#10;Apparel&#10;Accessories"
          />
          <p className="mt-1 text-xs text-black/55">
            Up to 16 short labels. They appear as chips on your card.
          </p>
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" rows={4} className="mt-1" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="previousPtLocation">Previous PT Location</Label>
            <Input
              id="previousPtLocation"
              name="previousPtLocation"
              className="mt-1"
              placeholder="e.g. Painted Tree Phoenix, AZ"
            />
          </div>
          <div>
            <Label htmlFor="currentLocation">Current Location</Label>
            <Input
              id="currentLocation"
              name="currentLocation"
              className="mt-1"
              placeholder="e.g. Online only / Tempe, AZ"
            />
          </div>
        </div>
        <div className="rounded-lg border border-black/10 bg-black/[0.02] p-4 space-y-4">
          <p className="text-sm font-medium text-black/80">Logo (optional — URL or upload)</p>
          <VendorImageUpload kind="logo" value={logoUrl} onChange={setLogoUrl} />
        </div>
        <div className="rounded-lg border border-black/10 bg-black/[0.02] p-4 space-y-4">
          <p className="text-sm font-medium text-black/80">Hero / banner image (optional — URL or upload)</p>
          <VendorImageUpload kind="hero" value={heroUrl} onChange={setHeroUrl} />
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            name="website"
            type="url"
            inputMode="url"
            className="mt-1"
            placeholder="https://your-store.example.com"
          />
        </div>
        {!isAuthed && !loading && (
          <div>
            <Label htmlFor="submitted_email">Your email (for updates)</Label>
            <Input id="submitted_email" name="submitted_email" type="email" required className="mt-1" />
          </div>
        )}
        <Button type="submit">Submit</Button>
        {msg && <p className="text-sm">{msg}</p>}
      </form>
    </div>
  );
}
