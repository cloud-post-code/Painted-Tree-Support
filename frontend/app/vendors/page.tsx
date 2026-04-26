"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/api";

type Vendor = {
  id: number;
  brand_name: string;
  category: string;
  city: string;
  state: string;
  bio_150: string;
  description_full?: string | null;
  pt_category_names?: string[];
  pt_current_locations?: string[];
  shop_links: { label: string; url: string }[];
  logo_url?: string | null;
  banner_url?: string | null;
  pt_previous_locations?: string[];
};

function categoryLabels(v: Vendor): string[] {
  if (v.pt_category_names && v.pt_category_names.length) return v.pt_category_names;
  return [v.category.charAt(0).toUpperCase() + v.category.slice(1)];
}

export default function VendorsPage() {
  const [rows, setRows] = useState<Vendor[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [st, setSt] = useState("");

  useEffect(() => {
    void fetch(apiUrl("/api/v1/vendors"))
      .then((r) => r.json())
      .then(setRows);
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((v) => {
      if (cat && v.category !== cat) return false;
      if (st && v.state !== st.toUpperCase()) return false;
      if (q) {
        const s = q.toLowerCase();
        const inCats = categoryLabels(v).some((c) => c.toLowerCase().includes(s));
        const inDesc = (v.description_full || "").toLowerCase().includes(s);
        if (
          !v.brand_name.toLowerCase().includes(s) &&
          !v.bio_150.toLowerCase().includes(s) &&
          !inCats &&
          !inDesc
        ) {
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
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or keywords" className="mt-1" />
        </div>
        <div>
          <Label>Category</Label>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="mt-1 w-full rounded-lg border border-black/15 p-2">
            <option value="">All</option>
            {["jewelry", "food", "clothing", "art", "beauty", "home", "other"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>State</Label>
          <Input value={st} onChange={(e) => setSt(e.target.value)} maxLength={2} placeholder="CA" className="mt-1" />
        </div>
      </div>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {filtered.map((v) => (
          <li key={v.id} className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm">
            {v.banner_url ? (
              <div className="aspect-[2/1] w-full bg-black/[0.04]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.banner_url}
                  alt=""
                  className="h-full w-full object-cover object-center"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : null}
            <div className="p-4">
              <div className="flex gap-3">
                {v.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={v.logo_url}
                    alt=""
                    className="mt-0.5 size-14 shrink-0 rounded-lg border border-black/10 object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <Link href={`/vendors/${v.id}`} className="text-lg font-semibold text-[var(--vrr-teal)]">
                    {v.brand_name}
                  </Link>
                  <p className="text-sm text-black/60">
                    {v.city}, {v.state}
                  </p>
                  <p className="mt-2 text-sm">{v.bio_150}</p>
                </div>
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
        ))}
      </ul>
    </div>
  );
}
