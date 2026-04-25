"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api";
import { MdBody } from "@/components/md-body";

type T = { id: number; title: string; body_md: string; channel?: string | null; tone?: string | null };

export function TemplatesList({ kind }: { kind: string }) {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    void fetch(apiUrl(`/api/v1/toolkit/templates?kind=${encodeURIComponent(kind)}`))
      .then((r) => r.json())
      .then(setItems);
  }, [kind]);

  async function copy(body: string) {
    await navigator.clipboard.writeText(body);
    void fetch(apiUrl("/api/v1/downloads/log"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "template-copy" }),
    });
  }

  return (
    <ul className="mt-6 space-y-6">
      {items.map((t) => (
        <li key={t.id} className="rounded-xl border border-black/10 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">{t.title}</h2>
            <Button type="button" variant="secondary" size="sm" onClick={() => void copy(t.body_md)}>
              Copy
            </Button>
          </div>
          <div className="mt-3 text-sm">
            <MdBody content={t.body_md} />
          </div>
        </li>
      ))}
    </ul>
  );
}
