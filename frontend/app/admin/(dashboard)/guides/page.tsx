"use client";

import { useEffect, useState } from "react";
import { readResponseBodyJson } from "@/lib/api";

export default function AdminGuidesPage() {
  const [rows, setRows] = useState<unknown[]>([]);
  useEffect(() => {
    void fetch("/api/bff/v1/admin/manage/guides", { credentials: "include" }).then(async (r) => {
      const j = await readResponseBodyJson<unknown[]>(r);
      if (Array.isArray(j)) setRows(j);
    });
  }, []);
  return (
    <div>
      <h1 className="text-xl font-bold">Guides</h1>
      <pre className="mt-4 max-h-[60vh] overflow-auto rounded border bg-black/[0.03] p-3 text-xs">{JSON.stringify(rows, null, 2)}</pre>
    </div>
  );
}
