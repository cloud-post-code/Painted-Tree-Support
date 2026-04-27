"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, UserCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { apiUrl, readResponseBodyJson, resolveMediaUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

export type Vendor = {
  id: number;
  name: string;
  categories: string[];
  description?: string | null;
  previousPtLocation?: string | null;
  currentLocation?: string | null;
  logoUrl?: string | null;
  heroUrl?: string | null;
  website?: string | null;
  featured?: boolean;
};

function vendorSearchHaystack(v: Vendor): string {
  const parts = [
    v.name,
    v.description || "",
    v.previousPtLocation || "",
    v.currentLocation || "",
    v.website || "",
    (v.categories || []).join(" "),
    String(v.id),
  ];
  return parts.join(" ").toLowerCase();
}

function VendorListCard({ v }: { v: Vendor }) {
  const [heroErr, setHeroErr] = useState(false);
  const [logoErr, setLogoErr] = useState(false);
  const heroSrc = resolveMediaUrl(v.heroUrl);
  const logoSrc = resolveMediaUrl(v.logoUrl);
  const showHero = Boolean(v.heroUrl && heroSrc && !heroErr);
  const showLogoFallback = !showHero && Boolean(v.logoUrl && logoSrc && !logoErr);

  return (
    <li className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
      <div className="relative">
        {showHero ? (
          <div className="aspect-[2/1] w-full overflow-hidden bg-gradient-to-br from-[var(--vrr-cream)] to-black/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroSrc!}
              alt=""
              className="h-full w-full object-cover object-center"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setHeroErr(true)}
            />
          </div>
        ) : showLogoFallback ? (
          <div className="flex aspect-[2/1] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[var(--vrr-cream)] to-black/10 p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc!}
              alt=""
              className="max-h-full max-w-full object-contain"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setLogoErr(true)}
            />
          </div>
        ) : (
          <div
            className="flex aspect-[2/1] w-full items-center justify-center bg-gradient-to-br from-[var(--vrr-teal)]/15 to-black/[0.04]"
            role="img"
            aria-label="No listing image"
          >
            <UserCircle className="h-[4.5rem] w-[4.5rem] text-black/25" strokeWidth={1.15} aria-hidden />
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-[var(--vrr-teal)]">{v.name}</h3>
          {v.description?.trim() ? (
            <p className="mt-2 text-sm text-black/80 line-clamp-3">{v.description}</p>
          ) : null}
          <div className="mt-3 space-y-1 text-xs text-black/60">
            {v.previousPtLocation ? (
              <p>
                <span className="font-semibold text-black/70">Previous PT:</span> {v.previousPtLocation}
              </p>
            ) : null}
            {v.currentLocation ? (
              <p>
                <span className="font-semibold text-black/70">Current location:</span> {v.currentLocation}
              </p>
            ) : null}
          </div>
        </div>
        {v.categories?.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {v.categories.map((c, i) => (
              <span
                key={`${v.id}-${i}-${c}`}
                className="rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-0.5 text-xs text-black/75"
              >
                {c}
              </span>
            ))}
          </div>
        ) : null}
        {v.website ? (
          <div className="mt-5 border-t border-black/[0.08] pt-4">
            <a
              href={v.website}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "default", size: "default" }),
                "w-full rounded-xl shadow-sm ring-1 ring-black/[0.04] transition-[box-shadow,transform] hover:shadow-md hover:ring-black/[0.06] active:scale-[0.99]",
              )}
              onClick={() =>
                trackEvent("external_link_click", { url: v.website || "", context: "vendor_card_website" })
              }
            >
              <span>Visit website</span>
              <ExternalLink className="opacity-90" aria-hidden />
            </a>
            <p className="mt-2 text-center text-[11px] font-medium tracking-wide text-black/45">
              Opens in a new tab
            </p>
          </div>
        ) : null}
      </div>
    </li>
  );
}

export default function VendorsPage() {
  const [rows, setRows] = useState<Vendor[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");

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
        const inCats = (v.categories || []).some((c) => c.toLowerCase().includes(catQ));
        if (!inCats) {
          return false;
        }
      }
      if (q) {
        if (!vendorSearchHaystack(v).includes(q.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [rows, q, cat]);

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
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Search</Label>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, description, location…"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="vendor-cat">Category</Label>
          <Input
            id="vendor-cat"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            placeholder="e.g. jewelry, food, art…"
            className="mt-1"
            autoComplete="off"
          />
        </div>
      </div>
      {loadErr ? (
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {loadErr}
        </p>
      ) : null}
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {filtered.map((v) => (
          <VendorListCard key={v.id} v={v} />
        ))}
      </ul>
    </div>
  );
}
