"use client";

import { useEffect, useState } from "react";

export default function AdminResourcesPage() {
  const [rows, setRows] = useState<unknown[]>([]);
  useEffect(() => {
    void fetch("/api/bff/v1/admin/manage/resources", { credentials: "include" })
      .then((r) => r.json())
      .then(setRows);
  }, []);
  return (
    <div>
      <h1 className="text-xl font-bold">Resources</h1>
      <p className="mt-2 text-sm text-black/60">Use API or CSV import via backend; list below is read-only.</p>
      <pre className="mt-4 max-h-[60vh] overflow-auto rounded border bg-black/[0.03] p-3 text-xs">{JSON.stringify(rows, null, 2)}</pre>
    </div>
  );
}
