"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Row = {
  id: number;
  brand_name: string;
  status: string;
  city: string;
  state: string;
};

export default function AdminVendorsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    void fetch("/api/bff/v1/admin/manage/vendors", { credentials: "include" })
      .then((r) => r.json())
      .then(setRows);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pending = useMemo(() => rows.filter((r) => r.status === "pending"), [rows]);
  const published = useMemo(() => rows.filter((r) => r.status === "published"), [rows]);

  const filteredPublished = useMemo(() => {
    if (!q.trim()) return published;
    const s = q.toLowerCase();
    return published.filter(
      (r) =>
        r.brand_name.toLowerCase().includes(s) ||
        `${r.city} ${r.state}`.toLowerCase().includes(s) ||
        String(r.id).includes(s),
    );
  }, [published, q]);

  async function publish(id: number) {
    await fetch(`/api/bff/v1/admin/manage/vendors/${id}?status=published`, { method: "PUT", credentials: "include" });
    load();
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-xl font-bold">Vendors (pending)</h1>
        <p className="mt-1 text-sm text-black/60">New submissions awaiting publish.</p>
        <ul className="mt-4 space-y-2 text-sm">
          {pending.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
              <span>
                #{r.id} {r.brand_name}
              </span>
              <div className="flex gap-2">
                <Link
                  href={`/admin/vendors/${r.id}`}
                  className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                >
                  Edit
                </Link>
                <Button size="sm" type="button" onClick={() => void publish(r.id)}>
                  Publish
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {!pending.length ? <p className="mt-2 text-sm text-black/50">No pending vendors.</p> : null}
      </section>

      <section>
        <h2 className="text-lg font-bold">Published vendors</h2>
        <p className="mt-1 text-sm text-black/60">
          Edit listings anytime (including on Railway). Changes apply to the public directory immediately after save.
        </p>
        <div className="mt-4 max-w-md">
          <Label htmlFor="search">Search published</Label>
          <Input
            id="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, city, or id"
            className="mt-1"
          />
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {filteredPublished.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
              <span>
                #{r.id} <span className="font-medium">{r.brand_name}</span>
                <span className="text-black/55">
                  {" "}
                  · {r.city}, {r.state}
                </span>
              </span>
              <Link
                href={`/admin/vendors/${r.id}`}
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
              >
                Edit
              </Link>
            </li>
          ))}
        </ul>
        {!published.length ? <p className="mt-2 text-sm text-black/50">No published vendors yet.</p> : null}
        {published.length > 0 && !filteredPublished.length ? (
          <p className="mt-2 text-sm text-black/50">No matches for that search.</p>
        ) : null}
      </section>
    </div>
  );
}
