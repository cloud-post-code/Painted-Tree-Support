"use client";

import { useEffect, useState } from "react";
import { readResponseBodyJson } from "@/lib/api";

export default function AdminCommunityPage() {
  const [rows, setRows] = useState<unknown[]>([]);
  useEffect(() => {
    void fetch("/api/bff/v1/admin/manage/community/links", { credentials: "include" }).then(async (r) => {
      const j = await readResponseBodyJson<unknown[]>(r);
      if (Array.isArray(j)) setRows(j);
    });
  }, []);
  return (
    <div>
      <h1 className="text-xl font-bold">Community links</h1>
      <pre className="mt-4 max-h-[60vh] overflow-auto text-xs">{JSON.stringify(rows, null, 2)}</pre>
    </div>
  );
}
