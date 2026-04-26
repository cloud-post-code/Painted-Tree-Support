"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readResponseBodyJson } from "@/lib/api";

type Audience = "all" | "vendors" | "volunteers" | "supporters" | "specific";

type Blast = {
  id: number;
  subject: string;
  body: string;
  link_url: string | null;
  link_text: string | null;
  audience: Audience;
  created_at: string | null;
  sent_at: string | null;
  recipient_count: number;
  read_count: number;
  dismissed_count: number;
};

type UserRow = { id: number; email: string };

const AUDIENCE_OPTIONS: { value: Audience; label: string; hint: string }[] = [
  { value: "all", label: "All users", hint: "Everyone with an active account." },
  { value: "vendors", label: "Vendors", hint: "Users who submitted a vendor profile." },
  { value: "volunteers", label: "Volunteers", hint: "Users who signed up to volunteer." },
  { value: "supporters", label: "Supporters", hint: "Users who offered a space or service." },
  { value: "specific", label: "Specific users", hint: "Pick one or more user IDs." },
];

export default function AdminBlastsPage() {
  const [audience, setAudience] = useState<Audience>("all");
  const [userIdsInput, setUserIdsInput] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [blasts, setBlasts] = useState<Blast[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const load = async () => {
    const r = await fetch("/api/bff/v1/admin/blasts", { credentials: "include", cache: "no-store" });
    if (r.ok) {
      const j = await readResponseBodyJson<Blast[]>(r);
      if (Array.isArray(j)) setBlasts(j);
    }
  };

  const loadUsers = async () => {
    const r = await fetch("/api/bff/v1/admin/users", { credentials: "include", cache: "no-store" });
    if (r.ok) {
      const j = await readResponseBodyJson<UserRow[]>(r);
      if (Array.isArray(j)) setUsers(j.map((u) => ({ id: u.id, email: u.email })));
    }
  };

  useEffect(() => {
    void load();
    void loadUsers();
  }, []);

  const audienceHint = useMemo(
    () => AUDIENCE_OPTIONS.find((o) => o.value === audience)?.hint ?? "",
    [audience],
  );

  return (
    <div className="max-w-3xl space-y-10">
      <div>
        <h1 className="text-xl font-bold">Message blasts</h1>
        <p className="mt-1 text-sm text-black/60">
          Send a message to every account, a segment, or specific users. Recipients see it in their /account inbox.
        </p>
      </div>

      <form
        className="space-y-4 rounded-lg border border-black/10 bg-white p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg("");
          setSubmitting(true);
          try {
            const fd = new FormData(e.currentTarget);
            const userIds =
              audience === "specific"
                ? userIdsInput
                    .split(/[\s,]+/)
                    .map((v) => Number(v.trim()))
                    .filter((n) => Number.isFinite(n) && n > 0)
                : [];
            const payload = {
              subject: String(fd.get("subject") || ""),
              body: String(fd.get("body") || ""),
              link_url: String(fd.get("link_url") || "") || null,
              link_text: String(fd.get("link_text") || "") || null,
              audience,
              user_ids: userIds,
            };
            const r = await fetch("/api/bff/v1/admin/blasts", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            const data = await readResponseBodyJson<{ recipient_count?: number; detail?: string }>(r);
            if (!r.ok || !data) {
              setMsg(data?.detail || "Could not send blast.");
              return;
            }
            setMsg(`Sent to ${data.recipient_count ?? 0} recipient(s).`);
            (e.target as HTMLFormElement).reset();
            setUserIdsInput("");
            await load();
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <div>
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" name="subject" required maxLength={255} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="body">Body</Label>
          <Textarea id="body" name="body" required rows={5} className="mt-1" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="link_url">Link URL (optional)</Label>
            <Input id="link_url" name="link_url" type="url" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="link_text">Link text (optional)</Label>
            <Input id="link_text" name="link_text" maxLength={255} className="mt-1" />
          </div>
        </div>

        <div>
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="text-sm font-medium text-[var(--foreground)]">Audience</legend>
            <div className="mt-1 grid gap-2 sm:grid-cols-2">
            {AUDIENCE_OPTIONS.map((o) => (
              <label
                key={o.value}
                className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm ${
                  audience === o.value ? "border-[var(--vrr-teal)] bg-[var(--vrr-teal)]/5" : "border-black/10"
                }`}
              >
                <input
                  type="radio"
                  name="audience"
                  value={o.value}
                  checked={audience === o.value}
                  onChange={() => setAudience(o.value)}
                  className="mt-0.5 shrink-0"
                />
                <span className="min-w-0 font-medium">
                  {o.label}
                  <span className="mt-0.5 block text-xs font-normal text-black/60">{o.hint}</span>
                </span>
              </label>
            ))}
          </div>
          {audience === "specific" && (
            <div className="mt-3">
              <Label htmlFor="user_ids">User IDs (comma or space separated)</Label>
              <Textarea
                id="user_ids"
                name="user_ids"
                rows={2}
                className="mt-1"
                placeholder="e.g. 12, 17, 42"
                value={userIdsInput}
                onChange={(e) => setUserIdsInput(e.target.value)}
              />
              <p className="mt-1 text-xs text-black/60">
                {users.length > 0
                  ? `Tip: visit Users to look up IDs (${users.length} known).`
                  : "No users loaded."}
              </p>
            </div>
          )}
          {audience !== "specific" && (
            <p className="mt-1 text-xs text-black/60">{audienceHint}</p>
          )}
        </fieldset>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send blast"}
          </Button>
          {msg && <p className="text-sm text-black/70">{msg}</p>}
        </div>
      </form>

      <section>
        <h2 className="text-lg font-semibold">Sent blasts</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {blasts.length === 0 && <li className="text-black/60">Nothing sent yet.</li>}
          {blasts.map((b) => (
            <li key={b.id} className="rounded border border-black/10 bg-white p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <span className="font-semibold">#{b.id} {b.subject}</span>
                  <span className="ml-2 text-xs uppercase tracking-wide text-black/50">{b.audience}</span>
                </div>
                <div className="text-xs text-black/60">
                  {b.sent_at ? new Date(b.sent_at).toLocaleString() : "—"}
                </div>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-black/70">{b.body}</p>
              <div className="mt-1 text-xs text-black/60">
                {b.recipient_count} recipient(s) · {b.read_count} read · {b.dismissed_count} dismissed
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
