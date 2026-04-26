"use client";

import { useEffect, useState } from "react";
import { readResponseBodyJson } from "@/lib/api";

export default function AdminLegalPage() {
  const [articles, setArticles] = useState<unknown[]>([]);
  const [orgs, setOrgs] = useState<unknown[]>([]);
  useEffect(() => {
    void fetch("/api/bff/v1/admin/manage/legal/articles", { credentials: "include" }).then(async (r) => {
      const j = await readResponseBodyJson<unknown[]>(r);
      if (Array.isArray(j)) setArticles(j);
    });
    void fetch("/api/bff/v1/admin/manage/legal/orgs", { credentials: "include" }).then(async (r) => {
      const j = await readResponseBodyJson<unknown[]>(r);
      if (Array.isArray(j)) setOrgs(j);
    });
  }, []);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">Legal articles</h1>
        <pre className="mt-2 max-h-48 overflow-auto text-xs">{JSON.stringify(articles, null, 2)}</pre>
      </div>
      <div>
        <h2 className="text-lg font-bold">Legal orgs</h2>
        <pre className="mt-2 max-h-48 overflow-auto text-xs">{JSON.stringify(orgs, null, 2)}</pre>
      </div>
    </div>
  );
}
