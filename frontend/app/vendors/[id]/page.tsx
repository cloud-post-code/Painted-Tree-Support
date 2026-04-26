import Link from "next/link";
import { notFound } from "next/navigation";
import { VendorShopLinks } from "@/components/vendor-shop-links";
import { apiGetNoStore } from "@/lib/api";

type Vendor = {
  id: number;
  brand_name: string;
  category: string;
  city: string;
  state: string;
  bio_150: string;
  description_full?: string | null;
  pt_category_names?: string[];
  pt_current_locations?: string[];
  shop_links: { label: string; url: string }[];
  logo_url?: string | null;
  banner_url?: string | null;
  pt_previous_locations?: string[];
};

function categoryLabels(v: Vendor): string[] {
  if (v.pt_category_names && v.pt_category_names.length) return v.pt_category_names;
  return [v.category.charAt(0).toUpperCase() + v.category.slice(1)];
}

export default async function VendorProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let v: Vendor | null = null;
  try {
    v = await apiGetNoStore<Vendor>(`/api/v1/vendors/${id}`);
  } catch {
    v = null;
  }
  if (!v) notFound();

  const bodyText = (v.description_full || "").trim() || v.bio_150;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/vendors" className="text-sm text-[var(--vrr-teal)]">
        ← Directory
      </Link>
      <h1 className="mt-4 text-3xl font-bold">{v.brand_name}</h1>
      <p className="text-sm text-black/60">
        {v.city}, {v.state}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {categoryLabels(v).map((c, i) => (
          <span
            key={`${v.id}-${i}-${c}`}
            className="rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-0.5 text-xs text-black/75"
          >
            {c}
          </span>
        ))}
      </div>
      {v.banner_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={v.banner_url}
          alt=""
          className="mt-4 w-full max-h-72 rounded-xl border border-black/10 object-cover object-center"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <div className="mt-4 flex flex-wrap items-start gap-4">
        {v.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={v.logo_url}
            alt=""
            className="size-24 shrink-0 rounded-xl border border-black/10 object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed">{bodyText}</p>
          {v.pt_previous_locations && v.pt_previous_locations.length > 0 ? (
            <p className="mt-3 text-sm text-black/65">
              <span className="font-medium text-black/80">Previous Painted Tree: </span>
              {v.pt_previous_locations.join(" · ")}
            </p>
          ) : null}
          {v.pt_current_locations && v.pt_current_locations.length > 0 ? (
            <p className="mt-2 text-sm text-black/65">
              <span className="font-medium text-black/80">Current location: </span>
              {v.pt_current_locations.join(" · ")}
            </p>
          ) : null}
        </div>
      </div>
      <VendorShopLinks links={v.shop_links || []} />
    </div>
  );
}
