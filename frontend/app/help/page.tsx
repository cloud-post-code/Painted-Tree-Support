import Link from "next/link";
import { apiGet } from "@/lib/api";

export const metadata = { title: "Help Vendors" };

export default async function HelpPage() {
  let counters: Record<string, number> = {};
  try {
    counters = await apiGet("/api/v1/counters");
  } catch {
    counters = {};
  }
  const spaces = counters.spaces_offered ?? 0;
  const services = counters.services_offered ?? 0;
  const helped = counters.vendors_helped ?? 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Help vendors</h1>
      <p className="mt-2 text-black/70">
        Offer space, skills, or visibility. Every purchase from the directory goes directly to displaced vendors.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-black/10 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-[var(--vrr-teal)]">{spaces}</p>
          <p className="text-sm text-black/60">Spaces offered</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-[var(--vrr-teal)]">{services}</p>
          <p className="text-sm text-black/60">Services donated</p>
        </div>
        <div className="rounded-xl border border-black/10 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-[var(--vrr-teal)]">{helped}</p>
          <p className="text-sm text-black/60">Vendors helped (counter)</p>
        </div>
      </div>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        <li className="rounded-xl border border-black/10 p-6">
          <h2 className="font-semibold">Offer retail space</h2>
          <p className="mt-2 text-sm text-black/65">List booths or pop-up availability.</p>
          <Link href="/help/space" className="mt-3 inline-block text-[var(--vrr-teal)]">
            Offer space
          </Link>
        </li>
        <li className="rounded-xl border border-black/10 p-6">
          <h2 className="font-semibold">Offer professional services</h2>
          <p className="mt-2 text-sm text-black/65">Marketing, legal, logistics, tech.</p>
          <Link href="/help/services" className="mt-3 inline-block text-[var(--vrr-teal)]">
            Offer services
          </Link>
        </li>
        <li className="rounded-xl border border-black/10 p-6">
          <h2 className="font-semibold">Shop vendors</h2>
          <p className="mt-2 text-sm text-black/65">Every purchase goes directly to a displaced vendor.</p>
          <Link href="/vendors" className="mt-3 inline-block text-[var(--vrr-teal)]">
            Browse directory
          </Link>
        </li>
        <li className="rounded-xl border border-black/10 p-6">
          <h2 className="font-semibold">Donate</h2>
          <p className="mt-2 text-sm text-black/65">Use Stripe test mode or external campaign until fiscal sponsor is confirmed.</p>
          <Link href="/help/donate" className="mt-3 inline-block text-[var(--vrr-teal)]">
            Donate
          </Link>
        </li>
      </ul>
      <p className="mt-8">
        <Link href="/help/volunteer" className="text-[var(--vrr-teal)]">
          Volunteer sign-up
        </Link>
        {" · "}
        <Link href="/help/supporters" className="text-[var(--vrr-teal)]">
          Supporter acknowledgments
        </Link>
      </p>
    </div>
  );
}
