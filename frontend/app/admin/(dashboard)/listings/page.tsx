"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { readResponseBodyJson } from "@/lib/api";

type Row = { id: number; status: string; brand_or_space_name: string };

export default function AdminListingsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const load = useCallback(() => {
    void fetch("/api/bff/v1/admin/manage/listings?status=pending", { credentials: "include" }).then(async (r) => {
      const j = await readResponseBodyJson<Row[]>(r);
      if (Array.isArray(j)) setRows(j);
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function publish(id: number) {
    await fetch(`/api/bff/v1/admin/manage/listings/${id}?status=published`, {
      method: "PUT",
      credentials: "include",
    });
    load();
  }

  return (
    <div>
      <h1 className="text-xl font-bold">Listings (pending)</h1>
      <ul className="mt-4 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 rounded border p-2">
            <span>
              #{r.id} {r.brand_or_space_name}
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
