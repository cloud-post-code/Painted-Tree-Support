"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { readResponseBodyJson } from "@/lib/api";

const VENDOR_CSV_TEMPLATE = `brand_name,category,city,state,zip,address_line1,address_line2,phone,fax,contact_name,contact_email,submitted_email,bio_150,description_full,shop_url,shop_inperson_url,status,featured,pt_category_names,pt_current_locations
"Example Studio",art,Austin,TX,78701,123 Main St,,512-555-0100,,Jane Doe,jane@example.com,owner@example.com,"Short card text","Longer story…",https://shop.example,https://maps.example,published,false,"Paintings|Mixed media","Location A|Location B"`;

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

  function downloadCsvTemplate() {
    const blob = new Blob([VENDOR_CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vendors-import-template.csv";
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
          UTF-8 CSV. Header names are case-insensitive. Required column: <code className="text-xs">brand_name</code>{" "}
          (or <code className="text-xs">name</code>). Other columns are optional — see template. New rows default to{" "}
          <strong>published</strong> unless you set <code className="text-xs">status</code> to{" "}
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
          <Button type="button" variant="secondary" onClick={downloadCsvTemplate}>
            Download template
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
        <ul className="mt-4 space-y-2 text-sm">
          {filteredPublished.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
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
