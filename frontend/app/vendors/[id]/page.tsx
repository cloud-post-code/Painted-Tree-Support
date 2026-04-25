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
  shop_links: { label: string; url: string }[];
};

export default async function VendorProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let v: Vendor | null = null;
  try {
    v = await apiGetNoStore<Vendor>(`/api/v1/vendors/${id}`);
  } catch {
    v = null;
  }
  if (!v) notFound();

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <Link href="/vendors" className="text-sm text-[var(--vrr-teal)]">
        ← Directory
      </Link>
      <h1 className="mt-4 text-3xl font-bold">{v.brand_name}</h1>
      <p className="text-sm text-black/60">
        {v.category} · {v.city}, {v.state}
      </p>
      <p className="mt-4">{v.bio_150}</p>
      <VendorShopLinks links={v.shop_links || []} />
    </div>
  );
}
