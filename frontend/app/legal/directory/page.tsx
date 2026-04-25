"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import { Label } from "@/components/ui/label";

type Org = {
  id: number;
  name: string;
  type: string;
  states: string[];
  areas_of_practice: string[];
  website: string;
};

export default function LegalDirectoryPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [type, setType] = useState("");
  const [state, setState] = useState("");
  const [issue, setIssue] = useState("");

  useEffect(() => {
    const q = new URLSearchParams();
    if (type) q.set("type", type);
    if (state) q.set("state", state);
    if (issue) q.set("issue", issue);
    void fetch(apiUrl(`/api/v1/legal/orgs?${q.toString()}`))
      .then((r) => r.json())
      .then(setOrgs);
  }, [type, state, issue]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Legal directory</h1>
      <p className="mt-4 text-sm text-black/70">
        This is educational information, not legal advice. Consult a licensed attorney for your specific situation.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Type</Label>
          <select className="mt-1 w-full rounded-lg border p-2" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All</option>
            <option value="pro_bono">Pro bono</option>
            <option value="legal_aid">Legal aid</option>
          </select>
        </div>
        <div>
          <Label>State</Label>
          <input
            className="mt-1 w-full rounded-lg border p-2"
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase())}
            maxLength={2}
            placeholder="CA"
          />
        </div>
        <div>
          <Label>Issue keyword</Label>
          <input
            className="mt-1 w-full rounded-lg border p-2"
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            placeholder="bankruptcy"
          />
        </div>
      </div>
      <ul className="mt-8 space-y-4 text-sm">
        {orgs.map((o) => (
          <li key={o.id} className="rounded-lg border border-black/10 p-4">
            <p className="font-semibold">{o.name}</p>
            <p className="text-black/60">
              {o.type} · States: {(o.states || []).join(", ") || "national"}
            </p>
            <a href={o.website} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[var(--vrr-teal)]">
              Website
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
