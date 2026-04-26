"use client";

import { useEffect, useState } from "react";
import { readResponseBodyJson } from "@/lib/api";

export default function AdminResourcesPage() {
  const [rows, setRows] = useState<unknown[]>([]);
  useEffect(() => {
    void fetch("/api/bff/v1/admin/manage/resources", { credentials: "include" }).then(async (r) => {
      const j = await readResponseBodyJson<unknown[]>(r);
      if (Array.isArray(j)) setRows(j);
    });
  }, []);
  return (
    <div>
      <h1 className="text-xl font-bold">Resources</h1>
      <p className="mt-2 text-sm text-black/60">Use API or CSV import via backend; list below is read-only.</p>
      <pre className="mt-4 max-h-[60vh] overflow-auto rounded border bg-black/[0.03] p-3 text-xs">{JSON.stringify(rows, null, 2)}</pre>
    </div>
  );
}
