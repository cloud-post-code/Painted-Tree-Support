import Link from "next/link";
import { apiGet } from "@/lib/api";

type Guide = { slug: string; platform: string; title: string; summary?: string | null };

export const metadata = { title: "Where to Sell Now" };

export default async function SellNowIndex() {
  let guides: Guide[] = [];
  try {
    guides = await apiGet<Guide[]>("/api/v1/guides");
  } catch {
    guides = [];
  }
  const order = ["etsy", "shopify", "instagram", "tiktok", "linktree", "carrd"];
  const sorted = [...guides].sort(
    (a, b) => order.indexOf(a.platform) - order.indexOf(b.platform) || a.slug.localeCompare(b.slug)
  );
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Where to sell now</h1>
      <p className="mt-2 text-black/70">Step-by-step guides to get income moving again.</p>
      <ul className="mt-8 space-y-3">
        {sorted.map((g) => (
          <li key={g.slug}>
            <Link href={`/sell-now/${g.slug}`} className="text-lg font-semibold text-[var(--vrr-teal)] hover:underline">
              {g.title}
            </Link>
            {g.summary && <p className="text-sm text-black/65">{g.summary}</p>}
          </li>
        ))}
      </ul>
      <p className="mt-10">
        <Link href="/sell-now/listings" className="font-semibold text-[var(--vrr-teal)]">
          Listings board: booths & vendors seeking space
        </Link>
      </p>
    </div>
  );
}
