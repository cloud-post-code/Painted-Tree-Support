"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiUrl, readResponseBodyJson } from "@/lib/api";
import { MdBody } from "@/components/md-body";

type T = { id: number; title: string; body_md: string; channel?: string | null; tone?: string | null };

export function TemplatesList({ kind }: { kind: string }) {
  const [items, setItems] = useState<T[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    void fetch(apiUrl(`/api/v1/toolkit/templates?kind=${encodeURIComponent(kind)}`)).then(async (r) => {
      const j = await readResponseBodyJson<T[]>(r);
      if (Array.isArray(j)) setItems(j);
    });
  }, [kind]);

  useEffect(() => {
    if (copiedId == null) return;
    const t = window.setTimeout(() => setCopiedId(null), 2000);
    return () => window.clearTimeout(t);
  }, [copiedId]);

  async function copy(id: number, body: string) {
    try {
      await navigator.clipboard.writeText(body);
      setCopiedId(id);
    } catch {
      setCopiedId(null);
      return;
    }
    void fetch(apiUrl("/api/v1/downloads/log"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "template-copy" }),
    });
  }

  return (
    <div className="mt-6 grid gap-6">
      {items.map((t) => (
        <Card key={t.id}>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold leading-snug">{t.title}</CardTitle>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0"
              onClick={() => void copy(t.id, t.body_md)}
            >
              {copiedId === t.id ? "Copied" : "Copy"}
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm">
              <MdBody content={t.body_md} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
