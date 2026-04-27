"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readResponseBodyJson } from "@/lib/api";

type ShopLink = { label: string; url: string };

type VendorAdmin = {
  id: number;
  brand_name: string;
  category: string;
  city: string | null;
  state: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  phone: string | null;
  fax: string | null;
  contact_name: string | null;
  contact_email: string | null;
  bio_150: string | null;
  description_full: string | null;
  shop_links: ShopLink[];
  submitted_email: string;
  status: string;
  featured: boolean;
  pt_listing_id: number | null;
  logo_url: string | null;
  banner_url: string | null;
  pt_previous_locations: string[] | null;
  pt_category_names: string[];
  pt_current_locations: string[];
};

function linesFromList(list: string[] | null | undefined): string {
  if (!list || !list.length) return "";
  return list.join("\n");
}

export default function AdminVendorEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [v, setV] = useState<VendorAdmin | null>(null);

  const [brandName, setBrandName] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [fax, setFax] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [bio150, setBio150] = useState("");
  const [descriptionFull, setDescriptionFull] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [prevPt, setPrevPt] = useState("");
  const [currPt, setCurrPt] = useState("");
  const [catNames, setCatNames] = useState("");
  const [links, setLinks] = useState<ShopLink[]>([
    { label: "", url: "" },
    { label: "", url: "" },
    { label: "", url: "" },
    { label: "", url: "" },
  ]);
  const [status, setStatus] = useState("published");
  const [featured, setFeatured] = useState(false);

  const hydrate = useCallback((row: VendorAdmin) => {
    setBrandName(row.brand_name);
    setCategory(row.category);
    setCity(row.city ?? "");
    setState(row.state ?? "");
    setAddressLine1(row.address_line1 || "");
    setAddressLine2(row.address_line2 || "");
    setPostalCode(row.postal_code || "");
    setPhone(row.phone || "");
    setFax(row.fax || "");
    setContactName(row.contact_name || "");
    setContactEmail(row.contact_email || "");
    setBio150(row.bio_150 ?? "");
    setDescriptionFull(row.description_full || "");
    setLogoUrl(row.logo_url || "");
    setBannerUrl(row.banner_url || "");
    setPrevPt(linesFromList(row.pt_previous_locations));
    setCurrPt(linesFromList(row.pt_current_locations));
    setCatNames((row.pt_category_names || []).join("\n"));
    const sl = row.shop_links || [];
    const next: ShopLink[] = [...sl, ...Array.from({ length: 4 - sl.length }, () => ({ label: "", url: "" }))].slice(
      0,
      4,
    ) as ShopLink[];
    setLinks(next.length ? next : [{ label: "", url: "" }, { label: "", url: "" }, { label: "", url: "" }, { label: "", url: "" }]);
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
    const pt_prev = prevPt
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const pt_curr = currPt
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const pt_cats = catNames
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const shop_links = links
      .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
      .filter((l) => l.url.length > 0)
      .slice(0, 4);

    const payload = {
      brand_name: brandName.trim(),
      category,
      city: city.trim() || null,
      state: state.trim() ? state.trim().toUpperCase().slice(0, 8) : null,
      address_line1: addressLine1.trim() || null,
      address_line2: addressLine2.trim() || null,
      postal_code: postalCode.trim() || null,
      phone: phone.trim() || null,
      fax: fax.trim() || null,
      contact_name: contactName.trim() || null,
      contact_email: contactEmail.trim() || null,
      bio_150: bio150.trim() ? bio150.trim().slice(0, 160) : null,
      description_full: descriptionFull.trim() || null,
      logo_url: logoUrl.trim() || null,
      banner_url: bannerUrl.trim() || null,
      pt_previous_locations: pt_prev,
      pt_current_locations: pt_curr,
      pt_category_names: pt_cats,
      shop_links,
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
            {v.pt_listing_id != null ? ` · PT listing id: ${v.pt_listing_id}` : ""}
          </p>
        </div>
        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      {err ? <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800">{err}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="brand">Brand name</Label>
          <Input id="brand" value={brandName} onChange={(e) => setBrandName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="cat">Directory category</Label>
          <Input
            id="cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1"
            placeholder="Any category"
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
        <div>
          <Label htmlFor="city">City (optional)</Label>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="state">State / region (optional)</Label>
          <Input id="state" value={state} onChange={(e) => setState(e.target.value)} maxLength={8} className="mt-1" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="addr1">Address line 1</Label>
          <Input id="addr1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className="mt-1" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="addr2">Address line 2</Label>
          <Input id="addr2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="zip">ZIP / postal</Label>
          <Input id="zip" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="fax">Fax</Label>
          <Input id="fax" value={fax} onChange={(e) => setFax(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="contact">Contact name</Label>
          <Input id="contact" value={contactName} onChange={(e) => setContactName(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="contactEmail">Contact email (public if set)</Label>
          <Input
            id="contactEmail"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2 flex items-center gap-2 pt-1">
          <input id="feat" type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
          <Label htmlFor="feat" className="font-normal">
            Featured on site
          </Label>
        </div>
      </div>

      <div>
        <Label htmlFor="bio">Short bio (optional, directory card, max 160)</Label>
        <Input id="bio" value={bio150} onChange={(e) => setBio150(e.target.value)} maxLength={160} className="mt-1" />
        <p className="mt-1 text-xs text-black/50">{bio150.length}/160</p>
      </div>

      <div>
        <Label htmlFor="full">Full description (optional)</Label>
        <Textarea
          id="full"
          value={descriptionFull}
          onChange={(e) => setDescriptionFull(e.target.value)}
          rows={8}
          className="mt-1 font-mono text-sm"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="logo">Logo URL</Label>
          <Input id="logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="banner">Hero / banner URL</Label>
          <Input id="banner" value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} className="mt-1" />
        </div>
      </div>

      <div>
        <Label htmlFor="ptcat">Category tags (one per line, shown on public page)</Label>
        <Textarea id="ptcat" value={catNames} onChange={(e) => setCatNames(e.target.value)} rows={4} className="mt-1" />
      </div>

      <div>
        <Label htmlFor="ptprev">Previous Painted Tree locations (one per line)</Label>
        <Textarea id="ptprev" value={prevPt} onChange={(e) => setPrevPt(e.target.value)} rows={4} className="mt-1" />
      </div>

      <div>
        <Label htmlFor="ptcurr">Current locations (one per line)</Label>
        <Textarea id="ptcurr" value={currPt} onChange={(e) => setCurrPt(e.target.value)} rows={3} className="mt-1" />
      </div>

      <div>
        <p className="text-sm font-medium">Shop links (up to 4; URL required)</p>
        <ul className="mt-2 space-y-2">
          {links.map((l, i) => (
            <li key={i} className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Label"
                value={l.label}
                onChange={(e) => {
                  const next = [...links];
                  next[i] = { ...next[i], label: e.target.value };
                  setLinks(next);
                }}
              />
              <Input
                placeholder="https://…"
                value={l.url}
                onChange={(e) => {
                  const next = [...links];
                  next[i] = { ...next[i], url: e.target.value };
                  setLinks(next);
                }}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-2 border-t border-black/10 pt-4">
        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Link
          href={`/vendors/${id}`}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ variant: "secondary", size: "default" }), "inline-flex")}
        >
          View public page
        </Link>
      </div>
    </div>
  );
}
