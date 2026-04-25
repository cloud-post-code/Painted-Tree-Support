"use client";

import { useEffect, useState } from "react";

const KEY = "vrr_triage_done";

type Step = { id: number; position: number; title: string; body_md: string };

export function TriageProgress({ steps }: { steps: Step[] }) {
  const [done, setDone] = useState<Record<number, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setDone(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = (id: number) => {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  if (!steps.length) return null;

  return (
    <div className="no-print mt-4 rounded-lg border border-black/10 bg-white p-4 text-sm">
      <p className="font-medium">Your progress (saved on this device)</p>
      <ul className="mt-2 space-y-2">
        {steps.map((s) => (
          <li key={s.id} className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={!!done[s.id]}
              onChange={() => toggle(s.id)}
              className="mt-1"
              id={`step-${s.id}`}
            />
            <label htmlFor={`step-${s.id}`} className="cursor-pointer">
              {s.title}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
