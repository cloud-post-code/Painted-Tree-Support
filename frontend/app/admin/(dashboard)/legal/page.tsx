"use client";

import { useEffect, useState } from "react";

export default function AdminLegalPage() {
  const [articles, setArticles] = useState<unknown[]>([]);
  const [orgs, setOrgs] = useState<unknown[]>([]);
  useEffect(() => {
    void fetch("/api/bff/v1/admin/manage/legal/articles", { credentials: "include" })
      .then((r) => r.json())
      .then(setArticles);
    void fetch("/api/bff/v1/admin/manage/legal/orgs", { credentials: "include" })
      .then((r) => r.json())
      .then(setOrgs);
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
