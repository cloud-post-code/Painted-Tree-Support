"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Row = { id: number; brand_name: string; status: string };

export default function AdminVendorsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const load = useCallback(() => {
    void fetch("/api/bff/v1/admin/manage/vendors?status=pending", { credentials: "include" })
      .then((r) => r.json())
      .then(setRows);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function publish(id: number) {
    await fetch(`/api/bff/v1/admin/manage/vendors/${id}?status=published`, { method: "PUT", credentials: "include" });
    load();
  }

  return (
    <div>
      <h1 className="text-xl font-bold">Vendors (pending)</h1>
      <ul className="mt-4 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 rounded border p-2">
            <span>
              #{r.id} {r.brand_name}
            </span>
            <Button size="sm" type="button" onClick={() => void publish(r.id)}>
              Publish
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
