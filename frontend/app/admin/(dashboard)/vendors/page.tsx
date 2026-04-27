"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { readResponseBodyJson } from "@/lib/api";

// Marketplace / Main Street style column order (ref: https://medford.4goodvibes.shop/ )
const VENDOR_CSV_TEMPLATE = `shop_name,category,tagline,description_full,city,state,postal_code,address_line1,address_line2,phone,fax,contact_name,contact_email,submitted_email,shop_url,shop_inperson_url,logo_url,banner_url,status,featured,pt_category_names,pt_current_locations,pt_previous_locations,pt_listing_id,id
"Sample Artisan Coop",Gifts,Handmade in New England,Full story for the public profile after approval.,Medford,MA,02155,200 Main St,Suite 12,781-555-0100,,Alex Merchant,hello@shop.example,owner@shop.example,https://medford.4goodvibes.shop/,https://maps.example.com/place,https://images.example.com/logo.jpg,https://images.example.com/banner.jpg,published,false,"Gifts|Home decor","Downtown|Market hall","Riverside studio",,`;

// Compact product-style row: title → brand; description → body; vendor_logo / vendor_banner; hero_image with share_image fallback for banner when vendor_banner is empty; pt_listing_id links the Sell-Now listing card to update
const VENDOR_CSV_PRODUCT_STYLE_TEMPLATE = `title,description,price,category,quantity,vendor_logo,vendor_banner,hero_image,share_image,pt_listing_id
"Sample Maker",Handmade candles and gifts,24.99,Gifts,12,https://images.example.com/logo.jpg,,https://images.example.com/card-hero.jpg,https://images.example.com/og-share.jpg,`;

type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

type Row = {
  id: number;
  brand_name: string;
  status: string;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  submitted_email?: string;
};

export default function AdminVendorsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [csvRefresh, setCsvRefresh] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    void fetch("/api/bff/v1/admin/manage/vendors", { credentials: "include" }).then(async (r) => {
      const j = await readResponseBodyJson<Row[]>(r);
      if (Array.isArray(j)) setRows(j);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pending = useMemo(() => rows.filter((r) => r.status === "pending"), [rows]);
  const published = useMemo(() => rows.filter((r) => r.status === "published"), [rows]);

  const filteredPublished = useMemo(() => {
    if (!q.trim()) return published;
    const s = q.toLowerCase();
    return published.filter((r) => {
      const hay = [
        r.brand_name,
        r.city || "",
        r.state || "",
        r.postal_code || "",
        r.phone || "",
        r.contact_name || "",
        r.contact_email || "",
        r.submitted_email || "",
        String(r.id),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [published, q]);

  async function publish(id: number) {
    await fetch(`/api/bff/v1/admin/manage/vendors/${id}?status=published`, { method: "PUT", credentials: "include" });
    load();
  }

  function toggleSelected(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function selectAllFilteredPublished() {
    setSelected(filteredPublished.map((r) => r.id));
  }

  function clearSelected() {
    setSelected([]);
  }

  async function deleteSelected() {
    if (!selected.length || deleteBusy) return;
    const confirmed = window.confirm(`Delete ${selected.length} selected vendor(s)? This cannot be undone.`);
    if (!confirmed) return;
    setDeleteBusy(true);
    setDeleteErr(null);
    setDeleteMsg(null);
    const r = await fetch("/api/bff/v1/admin/manage/vendors/bulk-delete", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selected }),
    });
    const data = await readResponseBodyJson<{ deleted?: number; detail?: string }>(r);
    setDeleteBusy(false);
    if (!r.ok) {
      setDeleteErr(data?.detail || "Delete failed.");
      return;
    }
    const deleted = data?.deleted ?? selected.length;
    setDeleteMsg(`Deleted ${deleted} vendor(s).`);
    setSelected([]);
    load();
  }

  function downloadCsvTemplate(contents: string, filename: string) {
    const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function runCsvImport() {
    const input = fileRef.current;
    const f = input?.files?.[0];
    if (!f) {
      setImportErr("Choose a CSV file first.");
      setImportMsg(null);
      return;
    }
    setImportBusy(true);
    setImportErr(null);
    setImportMsg(null);
    const fd = new FormData();
    fd.append("file", f);
    const q = csvRefresh ? "?refresh=true" : "";
    const r = await fetch(`/api/bff/v1/admin/manage/vendors/import-csv${q}`, {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    setImportBusy(false);
    const data = await readResponseBodyJson<ImportResult & { detail?: unknown }>(r);
    if (!r.ok) {
      const d = data?.detail;
      setImportErr(typeof d === "string" ? d : "Import failed");
      return;
    }
    if (!data) {
      setImportErr("Invalid response from server");
      return;
    }
    setImportMsg(
      `Created ${data.created}, updated ${data.updated}, skipped ${data.skipped}.` +
        (data.errors?.length ? ` Warnings: ${data.errors.slice(0, 5).join(" · ")}` : ""),
    );
    if (input) input.value = "";
    load();
  }

  return (
    <div className="space-y-10">
      <section className="rounded-lg border border-black/10 bg-black/[0.02] p-4">
        <h2 className="text-lg font-bold">Import sellers (CSV)</h2>
        <p className="mt-1 text-sm text-black/65">
          UTF-8 CSV in <strong>marketplace / directory</strong> column order: shop name, category, copy, address,
          contact, online + in-person links, images, tags, and locations. Column names are case-insensitive;{" "}
          <code className="text-xs">shop_name</code> (or <code className="text-xs">brand_name</code> /{" "}
          <code className="text-xs">name</code> / <code className="text-xs">title</code>) is required. You can also
          use a compact row with{" "}
          <code className="text-xs">title</code>, <code className="text-xs">description</code>,{" "}
          <code className="text-xs">category</code>, <code className="text-xs">vendor_logo</code>,{" "}
          <code className="text-xs">vendor_banner</code>, <code className="text-xs">hero_image</code>,{" "}
          <code className="text-xs">share_image</code> (optional <code className="text-xs">price</code> /{" "}
          <code className="text-xs">quantity</code> are ignored). If <code className="text-xs">vendor_banner</code> is
          empty, the profile banner uses <code className="text-xs">hero_image</code> when set, otherwise{" "}
          <code className="text-xs">share_image</code>. Set <code className="text-xs">pt_listing_id</code> (or{" "}
          <code className="text-xs">listing_id</code>) to a Sell-Now listing id to update that board card’s title,
          description, category, and hero image (same hero/share/banner/logo rules). Layout matches common multi-vendor
          mall sites such as{" "}
          <a
            href="https://medford.4goodvibes.shop/"
            className="font-medium text-[var(--vrr-teal)] underline"
            target="_blank"
            rel="noreferrer"
          >
            4 Good Vibes
          </a>
          . New rows default to <strong>published</strong> unless <code className="text-xs">status</code> is{" "}
          <code className="text-xs">pending</code> or <code className="text-xs">removed</code>.
        </p>
        <p className="mt-2 text-sm text-black/65">
          <strong>Without &quot;refresh&quot;:</strong> skips rows if that <code className="text-xs">brand_name</code>{" "}
          already exists. <strong>With refresh:</strong> updates by <code className="text-xs">id</code> if present,
          otherwise the first vendor with the same name (case-insensitive).
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="vendor-csv">CSV file</Label>
            <Input id="vendor-csv" ref={fileRef} type="file" accept=".csv,text/csv" className="mt-1 max-w-xs" />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={csvRefresh} onChange={(e) => setCsvRefresh(e.target.checked)} />
            Refresh existing (update mode)
          </label>
          <Button type="button" disabled={importBusy} onClick={() => void runCsvImport()}>
            {importBusy ? "Uploading…" : "Upload & import"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => downloadCsvTemplate(VENDOR_CSV_TEMPLATE, "marketplace-vendors-import-template.csv")}>
            Download directory template
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              downloadCsvTemplate(
                VENDOR_CSV_PRODUCT_STYLE_TEMPLATE,
                "vendors-import-title-images-template.csv",
              )
            }
          >
            Download title + images template
          </Button>
        </div>
        {importErr ? <p className="mt-3 text-sm text-red-700">{importErr}</p> : null}
        {importMsg ? <p className="mt-3 text-sm text-green-800">{importMsg}</p> : null}
      </section>

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
            placeholder="Name, city, phone, email, ZIP…"
            className="mt-1"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={selectAllFilteredPublished} disabled={!filteredPublished.length || deleteBusy}>
            Select all shown
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={clearSelected} disabled={!selected.length || deleteBusy}>
            Clear selection
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-red-600 text-red-700 hover:bg-red-50"
            onClick={() => void deleteSelected()}
            disabled={!selected.length || deleteBusy}
          >
            {deleteBusy ? "Deleting…" : `Delete selected (${selected.length})`}
          </Button>
        </div>
        {deleteErr ? <p className="mt-2 text-sm text-red-700">{deleteErr}</p> : null}
        {deleteMsg ? <p className="mt-2 text-sm text-green-800">{deleteMsg}</p> : null}
        <ul className="mt-4 space-y-2 text-sm">
          {filteredPublished.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  checked={selected.includes(r.id)}
                  onChange={() => toggleSelected(r.id)}
                  disabled={deleteBusy}
                  aria-label={`Select vendor ${r.brand_name}`}
                />
                <span>
                  #{r.id} <span className="font-medium">{r.brand_name}</span>
                  <span className="text-black/55">
                    {" "}
                    ·{" "}
                    {[r.city, r.state].filter((x) => x && String(x).trim()).join(", ") || "—"}
                    {r.postal_code ? ` ${r.postal_code}` : ""}
                    {r.phone ? ` · ${r.phone}` : ""}
                  </span>
                </span>
              </label>
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
