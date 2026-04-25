"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Row = { id: number; body: string; published: boolean };

export default function AdminAnnouncementsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const load = () =>
    void fetch("/api/bff/v1/admin/manage/announcements", { credentials: "include" })
      .then((r) => r.json())
      .then(setRows);
  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold">Announcements</h1>
      <form
        className="mt-6 max-w-xl space-y-3 rounded border border-black/10 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          await fetch("/api/bff/v1/admin/manage/announcements", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              body: fd.get("body"),
              published: fd.get("published") === "on",
              dismissible: true,
            }),
          });
          (e.target as HTMLFormElement).reset();
          load();
        }}
      >
        <Textarea name="body" placeholder="Banner text" required />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="published" /> Published
        </label>
        <Button type="submit">Create</Button>
      </form>
      <ul className="mt-8 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.id} className="rounded border border-black/10 p-2">
            #{r.id} {r.published ? "✓" : "○"} — {r.body.slice(0, 80)}…
          </li>
        ))}
      </ul>
    </div>
  );
}
