"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl, readResponseBodyJson, resolveMediaUrl } from "@/lib/api";

type Vendor = {
  id: number;
  brand_name: string;
  category: string;
  city?: string | null;
  state?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  fax?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  bio_150?: string | null;
  description_full?: string | null;
  pt_category_names?: string[];
  pt_current_locations?: string[];
  shop_links: { label: string; url: string }[];
  logo_url?: string | null;
  banner_url?: string | null;
  pt_previous_locations?: string[];
};

function formatVendorLocation(v: Vendor): string {
  const loc = [v.city, v.state].filter((x) => x && String(x).trim());
  const pc = (v.postal_code || "").trim();
  if (loc.length && pc) return `${loc.join(", ")} ${pc}`;
  if (loc.length) return loc.join(", ");
  if (pc) return pc;
  return "Location not listed";
}

function vendorSearchHaystack(v: Vendor): string {
  const parts = [
    v.brand_name,
    v.category || "",
    v.bio_150 || "",
    v.description_full || "",
    v.city || "",
    v.state || "",
    v.address_line1 || "",
    v.address_line2 || "",
    v.postal_code || "",
    v.phone || "",
    v.fax || "",
    v.contact_name || "",
    v.contact_email || "",
    String(v.id),
    ...(v.pt_category_names || []),
    ...(v.pt_current_locations || []),
  ];
  return parts.join(" ").toLowerCase();
}

function categoryLabels(v: Vendor): string[] {
  if (v.pt_category_names && v.pt_category_names.length) return v.pt_category_names;
  return [v.category.charAt(0).toUpperCase() + v.category.slice(1)];
}

function VendorListCard({ v }: { v: Vendor }) {
  const [bannerErr, setBannerErr] = useState(false);
  const [logoErr, setLogoErr] = useState(false);
  const bannerSrc = resolveMediaUrl(v.banner_url);
  const logoSrc = resolveMediaUrl(v.logo_url);
  const hasBanner = Boolean(v.banner_url && bannerSrc && !bannerErr);
  const hasLogo = Boolean(v.logo_url && logoSrc && !logoErr);
  const doubleStack = hasBanner && hasLogo;

  return (
    <li className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
      <div className="relative">
        {hasBanner ? (
          <div className="aspect-[2/1] w-full overflow-hidden bg-gradient-to-br from-[var(--vrr-cream)] to-black/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerSrc!}
              alt=""
              className="h-full w-full object-cover object-center"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setBannerErr(true)}
            />
            {hasLogo ? (
              <div className="absolute bottom-0 left-4 z-10 translate-y-1/2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSrc!}
                  alt={v.brand_name}
                  className="size-16 rounded-xl border-4 border-white bg-white object-cover shadow-md sm:size-20"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoErr(true)}
                />
              </div>
            ) : null}
          </div>
        ) : hasLogo ? (
          <div className="flex aspect-[2/1] items-center justify-center bg-gradient-to-br from-[var(--vrr-teal)]/12 to-[var(--vrr-cream)] px-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc!}
              alt={v.brand_name}
              className="max-h-28 max-w-[85%] object-contain"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setLogoErr(true)}
            />
          </div>
        ) : (
          <div
            className="aspect-[2/1] w-full bg-gradient-to-br from-[var(--vrr-teal)]/15 to-black/[0.04]"
            aria-hidden
          />
        )}
      </div>

      <div className={doubleStack ? "p-4 pt-12 sm:pt-14" : "p-4"}>
        <div className="min-w-0">
          <Link href={`/vendors/${v.id}`} className="text-lg font-semibold text-[var(--vrr-teal)] hover:underline">
            {v.brand_name}
          </Link>
          <p className="text-sm text-black/60">{formatVendorLocation(v)}</p>
          {v.contact_name || v.phone ? (
            <p className="mt-1 text-xs text-black/50">
              {[v.contact_name, v.phone].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          {v.bio_150?.trim() ? <p className="mt-2 text-sm line-clamp-3">{v.bio_150}</p> : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {categoryLabels(v).slice(0, 12).map((c, i) => (
            <span
              key={`${v.id}-${i}-${c}`}
              className="rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-0.5 text-xs text-black/75"
            >
              {c}
            </span>
          ))}
          {categoryLabels(v).length > 12 ? (
            <span className="text-xs text-black/50">+{categoryLabels(v).length - 12} more</span>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function VendorsPage() {
  const [rows, setRows] = useState<Vendor[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [st, setSt] = useState("");

  useEffect(() => {
    void fetch(apiUrl("/api/v1/vendors"))
      .then(async (r) => {
        const data = await readResponseBodyJson<Vendor[]>(r);
        if (data !== null && Array.isArray(data)) {
          setRows(data);
          setLoadErr(null);
          return;
        }
        setRows([]);
        setLoadErr(
          r.status >= 502
            ? "Directory is temporarily unavailable. Please refresh in a moment."
            : "Could not load vendors.",
        );
      })
      .catch(() => {
        setRows([]);
        setLoadErr("Could not load vendors.");
      });
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((v) => {
      const catQ = cat.trim().toLowerCase();
      if (catQ) {
        const main = (v.category || "").toLowerCase();
        const inLabels = categoryLabels(v).some((c) => c.toLowerCase().includes(catQ));
        if (!main.includes(catQ) && !inLabels) {
          return false;
        }
      }
      if (st && (v.state || "").toUpperCase() !== st.toUpperCase()) return false;
      if (q) {
        const s = q.toLowerCase();
        const inCats = categoryLabels(v).some((c) => c.toLowerCase().includes(s));
        if (!vendorSearchHaystack(v).includes(s) && !inCats) {
          return false;
        }
      }
      return true;
    });
  }, [rows, q, cat, st]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold">Vendor directory</h1>
          <p className="mt-2 text-black/70">Find displaced vendors and shop their new channels.</p>
        </div>
        <Link href="/vendors/submit" className="font-semibold text-[var(--vrr-teal)]">
          List your business
        </Link>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Search</Label>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, city, phone, email, ZIP…"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="vendor-cat">Category</Label>
          <Input
            id="vendor-cat"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            placeholder="e.g. jewelry, gifts, food…"
            className="mt-1"
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-black/50">Type any label; matches directory category and tags.</p>
        </div>
        <div>
          <Label>State</Label>
          <Input value={st} onChange={(e) => setSt(e.target.value)} maxLength={2} placeholder="CA" className="mt-1" />
        </div>
      </div>
      {loadErr ? <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">{loadErr}</p> : null}
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {filtered.map((v) => (
          <VendorListCard key={v.id} v={v} />
        ))}
      </ul>
    </div>
  );
}
