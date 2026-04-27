import Link from "next/link";
import { notFound } from "next/navigation";
import { VendorShopLinks } from "@/components/vendor-shop-links";
import { VendorProfileHero } from "@/components/vendor-profile-hero";
import { apiGetNoStore } from "@/lib/api";

type ShopLink = { label: string; url: string };

type Vendor = {
  id: number;
  productName: string;
  productDescription?: string | null;
  productPrice?: string | null;
  productCategory: string;
  productStock?: string | null;
  productImage?: string | null;
  productBrand?: string | null;
  productRating?: string | null;
  shopLinks: ShopLink[];
  pt_previous_locations?: string[];
  pt_category_names?: string[];
  pt_current_locations?: string[];
};

function categoryLabels(v: Vendor): string[] {
  if (v.pt_category_names && v.pt_category_names.length) return v.pt_category_names;
  const c = v.productCategory || "other";
  return [c.charAt(0).toUpperCase() + c.slice(1)];
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

  const bodyText = (v.productDescription || "").trim();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/vendors" className="text-sm text-[var(--vrr-teal)]">
        ← Directory
      </Link>
      <VendorProfileHero brandName={v.productName} bannerUrl={v.productImage} logoUrl={null} />
      <h1 className="mt-4 text-3xl font-bold">{v.productName}</h1>
      {v.productBrand ? <p className="text-sm text-black/65">{v.productBrand}</p> : null}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-black/60">
        {v.productPrice ? <span>productPrice: {v.productPrice}</span> : null}
        {v.productStock ? <span>productStock: {v.productStock}</span> : null}
        {v.productRating ? <span>productRating: {v.productRating}</span> : null}
      </div>
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
      <div className="mt-4 min-w-0">
        {bodyText ? (
          <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed">{bodyText}</p>
        ) : (
          <p className="text-sm text-black/55">No productDescription yet.</p>
        )}
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
      <VendorShopLinks links={v.shopLinks || []} />
    </div>
  );
}
