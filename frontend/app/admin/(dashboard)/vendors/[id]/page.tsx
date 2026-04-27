"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VendorImageUpload } from "@/components/vendor-image-upload";
import { readResponseBodyJson } from "@/lib/api";

type VendorAdmin = {
  id: number;
  name: string;
  categories: string[];
  description: string | null;
  previousPtLocation: string | null;
  currentLocation: string | null;
  logoUrl: string | null;
  heroUrl: string | null;
  website: string | null;
  submitted_email: string;
  status: string;
  featured: boolean;
};

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

export default function AdminVendorEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [v, setV] = useState<VendorAdmin | null>(null);

  const [name, setName] = useState("");
  const [categoriesText, setCategoriesText] = useState("");
  const [description, setDescription] = useState("");
  const [previousPtLocation, setPreviousPtLocation] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState("published");
  const [featured, setFeatured] = useState(false);

  const hydrate = useCallback((row: VendorAdmin) => {
    setName(row.name || "");
    setCategoriesText((row.categories || []).join("\n"));
    setDescription(row.description || "");
    setPreviousPtLocation(row.previousPtLocation || "");
    setCurrentLocation(row.currentLocation || "");
    setLogoUrl(row.logoUrl);
    setHeroUrl(row.heroUrl);
    setWebsite(row.website || "");
    setStatus(row.status);
    setFeatured(row.featured);
  }, []);

  useEffect(() => {
    if (!Number.isFinite(id) || id < 1) {
      setErr("Invalid vendor id");
      setLoading(false);
      return;
    }
    void fetch(`/api/bff/v1/admin/manage/vendors/${id}`, { credentials: "include" })
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/admin/login");
          return null;
        }
        if (!r.ok) {
          setErr(await r.text());
          return null;
        }
        const row = await readResponseBodyJson<VendorAdmin>(r);
        return row ?? null;
      })
      .then((row) => {
        if (row) {
          setV(row);
          hydrate(row);
        }
        setLoading(false);
      });
  }, [id, router, hydrate]);

  async function save() {
    setSaving(true);
    setErr(null);
    const payload = {
      name: name.trim(),
      categories: splitCategories(categoriesText),
      description: description.trim() || null,
      previousPtLocation: previousPtLocation.trim() || null,
      currentLocation: currentLocation.trim() || null,
      logoUrl: logoUrl?.trim() || null,
      heroUrl: heroUrl?.trim() || null,
      website: website.trim() || null,
      status,
      featured,
    };

    const r = await fetch(`/api/bff/v1/admin/manage/vendors/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (r.status === 401) {
      router.push("/admin/login");
      return;
    }
    if (!r.ok) {
      setErr(await r.text());
      return;
    }
    const updated = await readResponseBodyJson<VendorAdmin>(r);
    if (!updated) {
      setErr("Invalid response from server");
      return;
    }
    setV(updated);
    hydrate(updated);
  }

  if (loading) {
    return <p className="text-sm text-black/60">Loading…</p>;
  }
  if (!v && err) {
    return (
      <div>
        <p className="text-sm text-red-700">{err}</p>
        <Link href="/admin/vendors" className="mt-4 inline-block text-[var(--vrr-teal)]">
          ← Vendors
        </Link>
      </div>
    );
  }
  if (!v) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/admin/vendors" className="text-sm text-[var(--vrr-teal)]">
            ← Vendors
          </Link>
          <h1 className="mt-2 text-xl font-bold">Edit vendor</h1>
          <p className="text-sm text-black/60">
            #{v.id} · Submitted: {v.submitted_email}
          </p>
        </div>
        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      {err ? <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800">{err}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="categories">Categories (one per line, or | / comma separated)</Label>
          <Textarea
            id="categories"
            value={categoriesText}
            onChange={(e) => setCategoriesText(e.target.value)}
            rows={4}
            className="mt-1"
            placeholder="e.g.&#10;Apparel&#10;Accessories"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="previousPtLocation">Previous PT Location</Label>
          <Input
            id="previousPtLocation"
            value={previousPtLocation}
            onChange={(e) => setPreviousPtLocation(e.target.value)}
            className="mt-1"
            placeholder="e.g. Painted Tree Phoenix, AZ"
          />
        </div>
        <div>
          <Label htmlFor="currentLocation">Current Location</Label>
          <Input
            id="currentLocation"
            value={currentLocation}
            onChange={(e) => setCurrentLocation(e.target.value)}
            className="mt-1"
            placeholder="e.g. Online + Tempe, AZ"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            type="url"
            inputMode="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="mt-1"
            placeholder="https://…"
          />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/15 p-2"
          >
            <option value="pending">pending</option>
            <option value="published">published</option>
            <option value="removed">removed</option>
          </select>
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input id="feat" type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
          <Label htmlFor="feat" className="font-normal">
            Featured on site
          </Label>
        </div>
      </div>

      <div className="space-y-4 border-t border-black/10 pt-4">
        <p className="text-sm font-medium text-black/80">Logo (URL or upload)</p>
        <VendorImageUpload kind="logo" value={logoUrl} onChange={setLogoUrl} />
      </div>

      <div className="space-y-4 border-t border-black/10 pt-4">
        <p className="text-sm font-medium text-black/80">Hero / banner image (URL or upload)</p>
        <VendorImageUpload kind="hero" value={heroUrl} onChange={setHeroUrl} />
      </div>

      <div className="flex gap-2 border-t border-black/10 pt-4">
        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
