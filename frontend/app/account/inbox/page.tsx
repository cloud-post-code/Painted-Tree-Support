"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { readResponseBodyJson } from "@/lib/api";

type Blast = {
  recipient_id: number;
  blast_id: number;
  subject: string;
  body: string;
  link_url: string | null;
  link_text: string | null;
  audience: string;
  sent_at: string | null;
  read_at: string | null;
  dismissed_at: string | null;
};

type Announcement = {
  id: number;
  body: string;
  link_url: string | null;
  link_text: string | null;
  starts_at: string | null;
  ends_at: string | null;
};

type Inbox = {
  unread_count: number;
  blasts: Blast[];
  announcements: Announcement[];
};

export default function InboxPage() {
  const [inbox, setInbox] = useState<Inbox | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const r = await fetch("/api/bff/v1/account/inbox", {
      credentials: "include",
      cache: "no-store",
    });
    if (r.ok) {
      const j = await readResponseBodyJson<Inbox>(r);
      setInbox(j);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const act = async (recipientId: number, action: "read" | "dismiss") => {
    await fetch(`/api/bff/v1/account/inbox/${recipientId}/${action}`, {
      method: "POST",
      credentials: "include",
    });
    await load();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Inbox</h1>
        <p className="mt-1 text-sm text-black/60">Messages and announcements from the team.</p>
      </div>

      {loading && <p className="text-sm text-black/60">Loading…</p>}

      {inbox && (
        <>
          <section>
            <h2 className="text-lg font-semibold">Messages</h2>
            {inbox.blasts.length === 0 ? (
              <p className="mt-2 text-sm text-black/60">No messages yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {inbox.blasts.map((b) => {
                  const unread = !b.read_at && !b.dismissed_at;
                  const dismissed = !!b.dismissed_at;
                  return (
                    <li
                      key={b.recipient_id}
                      className={`rounded-lg border p-4 ${
                        unread
                          ? "border-[var(--vrr-teal)]/50 bg-[var(--vrr-teal)]/5"
                          : dismissed
                            ? "border-black/10 bg-black/[0.02] opacity-60"
                            : "border-black/10 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{b.subject}</h3>
                            {unread && (
                              <span className="rounded-full bg-[var(--vrr-teal)] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                                New
                              </span>
                            )}
                          </div>
                          {b.sent_at && (
                            <div className="mt-0.5 text-[11px] text-black/50">
                              {new Date(b.sent_at).toLocaleString()}
                            </div>
                          )}
                          <p className="mt-2 whitespace-pre-wrap text-sm text-black/80">{b.body}</p>
                          {b.link_url && (
                            <a
                              href={b.link_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-block text-sm text-[var(--vrr-teal)] underline-offset-4 hover:underline"
                            >
                              {b.link_text || b.link_url}
                            </a>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col gap-2">
                          {!b.read_at && !dismissed && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void act(b.recipient_id, "read")}
                            >
                              Mark read
                            </Button>
                          )}
                          {!dismissed && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => void act(b.recipient_id, "dismiss")}
                            >
                              Dismiss
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold">Announcements</h2>
            {inbox.announcements.length === 0 ? (
              <p className="mt-2 text-sm text-black/60">No active announcements.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {inbox.announcements.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-black/10 bg-[var(--vrr-cream)] p-3 text-[var(--vrr-ink)]"
                  >
                    <p>{a.body}</p>
                    {a.link_url && (
                      <Link
                        href={a.link_url}
                        className="mt-1 inline-block text-[var(--vrr-teal)] underline-offset-4 hover:underline"
                      >
                        {a.link_text || "Learn more"}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
