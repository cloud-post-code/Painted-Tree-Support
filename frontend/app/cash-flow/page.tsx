"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LegalStrip } from "@/components/legal-strip";
import { apiUrl } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Row = {
  id: number;
  title: string;
  summary?: string | null;
  url: string;
  state?: string | null;
  deadline?: string | null;
  updated_at?: string | null;
};

export default function CashFlowPage() {
  const [grants, setGrants] = useState<Row[]>([]);
  const [emergency, setEmergency] = useState<Row[]>([]);
  const [state, setState] = useState("");

  useEffect(() => {
    const q = state ? `?state=${encodeURIComponent(state)}` : "";
    void fetch(apiUrl(`/api/v1/cashflow/grants${q}`))
      .then((r) => r.json())
      .then(setGrants);
    void fetch(apiUrl("/api/v1/cashflow/emergency"))
      .then((r) => r.json())
      .then(setEmergency);
  }, [state]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Cash flow relief hub</h1>
      <p className="mt-2 max-w-2xl text-black/70">
        Grants and emergency funds — filter by state when listings include state codes.
      </p>
      <div className="mt-6 max-w-xs">
        <Label htmlFor="st">State (optional)</Label>
        <Input id="st" value={state} onChange={(e) => setState(e.target.value.toUpperCase())} maxLength={2} placeholder="CA" className="mt-1" />
      </div>
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Grants</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {grants.map((g) => (
            <Card key={g.id}>
              <CardHeader>
                <CardTitle className="text-base">{g.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {g.summary && <p>{g.summary}</p>}
                {g.deadline && <p className="text-amber-800">Deadline: {g.deadline}</p>}
                <p className="text-xs text-black/50">Verified on: {g.updated_at?.slice(0, 10) || "—"}</p>
                <Link href={g.url} target="_blank" className="font-semibold text-[var(--vrr-teal)]" rel="noreferrer">
                  Open
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <section className="mt-12">
        <h2 className="text-xl font-semibold">Emergency funds</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {emergency.map((g) => (
            <Card key={g.id}>
              <CardHeader>
                <CardTitle className="text-base">{g.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {g.summary && <p>{g.summary}</p>}
                <Link href={g.url} target="_blank" className="mt-2 inline-block font-semibold text-[var(--vrr-teal)]" rel="noreferrer">
                  Open
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <LegalStrip />
    </div>
  );
}
