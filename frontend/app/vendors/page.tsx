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
  shop_links: { label: string; url: string }[];
};

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
        if (!v.brand_name.toLowerCase().includes(s) && !v.bio_150.toLowerCase().includes(s)) return false;
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
          <li key={v.id} className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
            <Link href={`/vendors/${v.id}`} className="text-lg font-semibold text-[var(--vrr-teal)]">
              {v.brand_name}
            </Link>
            <p className="text-sm text-black/60">
              {v.category} · {v.city}, {v.state}
            </p>
            <p className="mt-2 text-sm">{v.bio_150}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
