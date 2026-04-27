"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackEvent } from "@/lib/analytics";
import { apiUrl, readResponseBodyJson, resolveMediaUrl } from "@/lib/api";

type ShopLink = { label: string; url: string };

export type Vendor = {
  id: number;
  productName: string;
  productDescription?: string | null;
  productPrice?: string | null;
  productCategory: string;
  productStock?: string | null;
  productImage?: string | null;
  productBrand?: string | null;
  productRating?: string | null;
  shopLinks: ShopLink[];
  featured?: boolean;
};

function vendorSearchHaystack(v: Vendor): string {
  const parts = [
    v.productName,
    v.productBrand || "",
    v.productDescription || "",
    v.productCategory || "",
    v.productPrice || "",
    v.productStock || "",
    v.productRating || "",
    String(v.id),
  ];
  return parts.join(" ").toLowerCase();
}

function categoryLabels(v: Vendor): string[] {
  return [v.productCategory.charAt(0).toUpperCase() + v.productCategory.slice(1)];
}

/** First https link from shopLinks, preferring online / shop-style labels. */
function primaryVendorStoreUrl(links: ShopLink[] | undefined): string | null {
  const valid = (links || []).filter((l) => {
    const u = (l.url || "").trim();
    return u.startsWith("http://") || u.startsWith("https://");
  });
  if (!valid.length) return null;
  const online = valid.find((l) => /online|website|web|store|shop|etsy|instagram/i.test(l.label));
  return (online || valid[0]).url.trim();
}

function VendorListCard({ v }: { v: Vendor }) {
  const [imgErr, setImgErr] = useState(false);
  const imgSrc = resolveMediaUrl(v.productImage);
  const hasImg = Boolean(v.productImage && imgSrc && !imgErr);
  const storeUrl = primaryVendorStoreUrl(v.shopLinks);

  return (
    <li className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
      <div className="relative">
        {hasImg ? (
          <div className="aspect-[2/1] w-full overflow-hidden bg-gradient-to-br from-[var(--vrr-cream)] to-black/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc!}
              alt=""
              className="h-full w-full object-cover object-center"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setImgErr(true)}
            />
          </div>
        ) : (
          <div
            className="aspect-[2/1] w-full bg-gradient-to-br from-[var(--vrr-teal)]/15 to-black/[0.04]"
            aria-hidden
          />
        )}
      </div>

      <div className="p-4">
        <div className="min-w-0">
          <Link href={`/vendors/${v.id}`} className="text-lg font-semibold text-[var(--vrr-teal)] hover:underline">
            {v.productName}
          </Link>
          {v.productBrand ? <p className="text-sm text-black/70">{v.productBrand}</p> : null}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-black/60">
            {v.productPrice ? <span>Price: {v.productPrice}</span> : null}
            {v.productStock ? <span>Stock: {v.productStock}</span> : null}
            {v.productRating ? <span>Rating: {v.productRating}</span> : null}
          </div>
          {v.productDescription?.trim() ? (
            <p className="mt-2 text-sm line-clamp-3">{v.productDescription}</p>
          ) : null}
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
        </div>
        {storeUrl ? (
          <div className="mt-4 border-t border-black/10 pt-3">
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-sm font-semibold text-[var(--vrr-teal)] hover:underline"
              onClick={() => trackEvent("external_link_click", { url: storeUrl, context: "vendor_card_store" })}
            >
              Visit their store
            </a>
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
        const main = (v.productCategory || "").toLowerCase();
        const inLabels = categoryLabels(v).some((c) => c.toLowerCase().includes(catQ));
        if (!main.includes(catQ) && !inLabels) {
          return false;
        }
      }
      if (q) {
        const s = q.toLowerCase();
        const inCats = categoryLabels(v).some((c) => c.toLowerCase().includes(s));
        if (!vendorSearchHaystack(v).includes(s) && !inCats) {
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
            placeholder="Name, brand, description, price…"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="vendor-cat">productCategory</Label>
          <Input
            id="vendor-cat"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            placeholder="e.g. electronics, gifts…"
            className="mt-1"
            autoComplete="off"
          />
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
