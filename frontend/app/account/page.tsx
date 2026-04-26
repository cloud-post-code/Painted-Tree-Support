"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusPill } from "@/components/status-pill";
import { readResponseBodyJson } from "@/lib/api";
import { useCurrentUser } from "@/lib/use-current-user";

type SubmissionItem = {
  id: number;
  kind: string;
  title: string;
  subtitle: string;
  status: string;
  created_at: string | null;
  permalink: string | null;
};

type Submissions = {
  vendors: SubmissionItem[];
  listings: SubmissionItem[];
  space_offers: SubmissionItem[];
  service_offers: SubmissionItem[];
  volunteers: SubmissionItem[];
};

type Inbox = {
  unread_count: number;
  blasts: { recipient_id: number; subject: string; read_at: string | null; dismissed_at: string | null }[];
  announcements: { id: number }[];
};

export default function AccountOverview() {
  const { user, loading } = useCurrentUser();
  const [subs, setSubs] = useState<Submissions | null>(null);
  const [inbox, setInbox] = useState<Inbox | null>(null);

  useEffect(() => {
    void (async () => {
      const [s, i] = await Promise.all([
        fetch("/api/bff/v1/account/submissions", { credentials: "include", cache: "no-store" }),
        fetch("/api/bff/v1/account/inbox", { credentials: "include", cache: "no-store" }),
      ]);
      if (s.ok) setSubs(await readResponseBodyJson<Submissions>(s));
      if (i.ok) setInbox(await readResponseBodyJson<Inbox>(i));
    })();
  }, []);

  const totalSubs = subs
    ? subs.vendors.length +
      subs.listings.length +
      subs.space_offers.length +
      subs.service_offers.length +
      subs.volunteers.length
    : 0;
  const pending = subs
    ? [
        ...subs.vendors,
        ...subs.listings,
        ...subs.space_offers,
        ...subs.service_offers,
        ...subs.volunteers,
      ].filter((s) => s.status === "pending").length
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome{user ? `, ${user.email}` : ""}</h1>
        {loading ? null : user?.is_admin ? (
          <p className="mt-1 text-sm text-black/60">
            You have admin access.{" "}
            <Link href="/admin" className="text-[var(--vrr-teal)] underline-offset-4 hover:underline">
              Open admin portal
            </Link>
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card label="Total submissions" value={totalSubs} href="/account/submissions" />
        <Card label="Pending review" value={pending} href="/account/submissions" tone="warn" />
        <Card
          label="Unread messages"
          value={inbox?.unread_count ?? 0}
          href="/account/inbox"
          tone={inbox && inbox.unread_count > 0 ? "info" : "default"}
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold">Recent submissions</h2>
        <ul className="mt-3 divide-y divide-black/10 rounded-lg border border-black/10 bg-white">
          {subs &&
            [
              ...subs.vendors,
              ...subs.listings,
              ...subs.space_offers,
              ...subs.service_offers,
              ...subs.volunteers,
            ]
              .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
              .slice(0, 5)
              .map((s) => (
                <li key={`${s.kind}-${s.id}`} className="flex items-center justify-between gap-4 p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{s.title}</div>
                    <div className="truncate text-xs text-black/60">
                      {labelForKind(s.kind)} · {s.subtitle}
                    </div>
                  </div>
                  <StatusPill status={s.status} />
                </li>
              ))}
          {subs && totalSubs === 0 && (
            <li className="p-4 text-sm text-black/60">
              You haven&apos;t submitted anything yet.{" "}
              <Link className="text-[var(--vrr-teal)] underline-offset-4 hover:underline" href="/help">
                Browse ways to participate
              </Link>
              .
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  href,
  tone = "default",
}: {
  label: string;
  value: number;
  href: string;
  tone?: "default" | "warn" | "info";
}) {
  const toneClass =
    tone === "warn"
      ? "text-amber-700"
      : tone === "info"
        ? "text-[var(--vrr-teal)]"
        : "text-[var(--vrr-ink)]";
  return (
    <Link
      href={href}
      className="block rounded-lg border border-black/10 bg-white p-4 transition-colors hover:bg-black/[0.02]"
    >
      <div className="text-xs uppercase tracking-wide text-black/50">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${toneClass}`}>{value}</div>
    </Link>
  );
}

function labelForKind(k: string): string {
  switch (k) {
    case "vendor":
      return "Vendor profile";
    case "listing":
      return "Listing";
    case "space_offer":
      return "Space offer";
    case "service_offer":
      return "Service offer";
    case "volunteer":
      return "Volunteer signup";
    default:
      return k;
  }
}

