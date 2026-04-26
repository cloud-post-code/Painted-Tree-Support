"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readResponseBodyJson } from "@/lib/api";

type Row = {
  id: number;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  email_verified: boolean;
  created_at: string | null;
  submission_count: number;
};

export default function AdminUsersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const url = new URL("/api/bff/v1/admin/users", window.location.origin);
    if (search) url.searchParams.set("search", search);
    const r = await fetch(url.toString(), { credentials: "include", cache: "no-store" });
    if (r.ok) {
      const j = await readResponseBodyJson<Row[]>(r);
      if (Array.isArray(j)) setRows(j);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adminCount = useMemo(() => rows.filter((r) => r.is_admin).length, [rows]);

  const patch = async (id: number, body: Partial<Pick<Row, "is_admin" | "is_active">>) => {
    setSavingId(id);
    try {
      await fetch(`/api/bff/v1/admin/users/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold">Users</h1>
      <p className="mt-1 text-sm text-black/60">
        Toggle admin access or deactivate accounts. {adminCount} admin{adminCount === 1 ? "" : "s"} of {rows.length}{" "}
        users.
      </p>

      <form
        className="mt-4 flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email…"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {loading ? (
        <p className="mt-6 text-sm text-black/60">Loading…</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-black/50">
              <tr>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Submissions</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Admin</th>
                <th className="py-2 pr-4">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 pr-4">
                    <div className="font-medium">{r.email}</div>
                    {r.email_verified && (
                      <div className="text-[10px] uppercase tracking-wide text-emerald-700">verified</div>
                    )}
                  </td>
                  <td className="py-2 pr-4">{r.submission_count}</td>
                  <td className="py-2 pr-4 text-xs text-black/60">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={r.is_admin}
                        disabled={savingId === r.id}
                        onChange={(e) => void patch(r.id, { is_admin: e.target.checked })}
                      />
                      <span className="text-xs">{r.is_admin ? "Admin" : "—"}</span>
                    </label>
                  </td>
                  <td className="py-2 pr-4">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={r.is_active}
                        disabled={savingId === r.id}
                        onChange={(e) => void patch(r.id, { is_active: e.target.checked })}
                      />
                      <span className="text-xs">{r.is_active ? "Active" : "Disabled"}</span>
                    </label>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-black/60">
                    No users.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
