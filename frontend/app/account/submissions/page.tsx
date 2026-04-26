"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusPill } from "@/components/status-pill";
import { readResponseBodyJson } from "@/lib/api";

type Item = {
  id: number;
  kind: string;
  title: string;
  subtitle: string;
  status: string;
  created_at: string | null;
  permalink: string | null;
};

type Submissions = {
  vendors: Item[];
  listings: Item[];
  space_offers: Item[];
  service_offers: Item[];
  volunteers: Item[];
};

const SECTIONS: { key: keyof Submissions; label: string; emptyHref: string; emptyLabel: string }[] = [
  { key: "vendors", label: "Vendor profiles", emptyHref: "/vendors/submit", emptyLabel: "Submit a profile" },
  { key: "listings", label: "Listings", emptyHref: "/sell-now/listings", emptyLabel: "Post a listing" },
  { key: "space_offers", label: "Space offers", emptyHref: "/help/space", emptyLabel: "Offer a space" },
  { key: "service_offers", label: "Service offers", emptyHref: "/help/services", emptyLabel: "Offer a service" },
  { key: "volunteers", label: "Volunteer signups", emptyHref: "/help/volunteer", emptyLabel: "Volunteer" },
];

export default function MySubmissionsPage() {
  const [data, setData] = useState<Submissions | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/bff/v1/account/submissions", {
        credentials: "include",
        cache: "no-store",
      });
      if (r.ok) {
        const j = await readResponseBodyJson<Submissions>(r);
        setData(j);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">My submissions</h1>
        <p className="mt-1 text-sm text-black/60">
          Every form you&apos;ve sent us, with its current status. Anything submitted with this email before signing up
          has been linked here automatically.
        </p>
      </div>
      {loading && <p className="text-sm text-black/60">Loading…</p>}
      {data &&
        SECTIONS.map((sec) => {
          const items = data[sec.key];
          return (
            <section key={sec.key}>
              <h2 className="text-lg font-semibold">{sec.label}</h2>
              {items.length === 0 ? (
                <p className="mt-2 text-sm text-black/60">
                  None yet.{" "}
                  <Link
                    className="text-[var(--vrr-teal)] underline-offset-4 hover:underline"
                    href={sec.emptyHref}
                  >
                    {sec.emptyLabel}
                  </Link>
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-black/10 rounded-lg border border-black/10 bg-white">
                  {items.map((it) => (
                    <li key={it.id} className="flex items-center justify-between gap-4 p-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{it.title}</div>
                        <div className="truncate text-xs text-black/60">{it.subtitle}</div>
                        {it.created_at && (
                          <div className="mt-0.5 text-[11px] text-black/40">
                            Submitted {new Date(it.created_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusPill status={it.status} />
                        {it.permalink && (
                          <Link
                            href={it.permalink}
                            className="text-xs text-[var(--vrr-teal)] underline-offset-4 hover:underline"
                          >
                            View
                          </Link>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
    </div>
  );
}
