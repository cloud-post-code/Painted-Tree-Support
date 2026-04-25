"use client";

import { useEffect, useState } from "react";

export default function AdminCommunityPage() {
  const [rows, setRows] = useState<unknown[]>([]);
  useEffect(() => {
    void fetch("/api/bff/v1/admin/manage/community/links", { credentials: "include" })
      .then((r) => r.json())
      .then(setRows);
  }, []);
  return (
    <div>
      <h1 className="text-xl font-bold">Community links</h1>
      <pre className="mt-4 max-h-[60vh] overflow-auto text-xs">{JSON.stringify(rows, null, 2)}</pre>
    </div>
  );
}
