"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { readResponseBodyJson } from "@/lib/api";

// Canonical vendor CSV: exactly eight product columns (same names as DB / survey), plus optional operational columns.
const VENDOR_CSV_TEMPLATE = `productName,productDescription,productPrice,productCategory,productStock,productImage,productBrand,productRating,submitted_email,shop_url,shop_inperson_url,status,featured,pt_listing_id,id
"Wireless Headphones","High-quality noise-canceling wireless headphones.",199.99,Electronics,50,https://example.com/images/headphones.jpg,SoundPro,4.8,seller@example.com,https://store.example.com,,published,false,,`;

// Same eight columns with legacy aliases (title → productName, etc.) still supported by the importer.
const VENDOR_CSV_LEGACY_ALIASES_TEMPLATE = `title,description,price,category,quantity,vendor_logo,vendor_banner,hero_image,share_image,pt_listing_id,submitted_email
"Sample Maker",Handmade candles and gifts,24.99,Gifts,12,https://images.example.com/logo.jpg,,https://images.example.com/card-hero.jpg,https://images.example.com/og-share.jpg,,seller@example.com`;

type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

type Row = {
  id: number;
  productName: string;
  productCategory?: string;
  status: string;
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
        r.productName,
        r.productCategory || "",
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
          Required column: <code className="text-xs">productName</code> (or legacy <code className="text-xs">title</code>{" "}
          / <code className="text-xs">brand_name</code>). The eight product fields are{" "}
          <code className="text-xs">productName</code>, <code className="text-xs">productDescription</code>,{" "}
          <code className="text-xs">productPrice</code>, <code className="text-xs">productCategory</code>,{" "}
          <code className="text-xs">productStock</code>, <code className="text-xs">productImage</code>,{" "}
          <code className="text-xs">productBrand</code>, <code className="text-xs">productRating</code>. Optional:{" "}
          <code className="text-xs">submitted_email</code>, shop URLs, <code className="text-xs">status</code>,{" "}
          <code className="text-xs">featured</code>, <code className="text-xs">pt_listing_id</code> (or{" "}
          <code className="text-xs">listing_id</code>) to sync a Sell-Now listing card. Older marketplace-style columns
          are still accepted via aliases. See{" "}
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
          <strong>Without &quot;refresh&quot;:</strong> skips rows if that <code className="text-xs">productName</code>{" "}
          already exists. <strong>With refresh:</strong> updates by <code className="text-xs">id</code> if present,
          otherwise the first vendor with the same productName (case-insensitive).
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
          <Button
            type="button"
            variant="secondary"
            onClick={() => downloadCsvTemplate(VENDOR_CSV_TEMPLATE, "vendors-product-import-template.csv")}
          >
            Download product template (8 columns)
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              downloadCsvTemplate(VENDOR_CSV_LEGACY_ALIASES_TEMPLATE, "vendors-import-legacy-aliases-template.csv")
            }
          >
            Download legacy alias template
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
                #{r.id} {r.productName}
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
            placeholder="Product name, category, email, id…"
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
                  aria-label={`Select vendor ${r.productName}`}
                />
                <span>
                  #{r.id} <span className="font-medium">{r.productName}</span>
                  <span className="text-black/55">
                    {" "}
                    ·{" "}
                    {r.productCategory || "—"}
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
