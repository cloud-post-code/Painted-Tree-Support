import Link from "next/link";
import { notFound } from "next/navigation";
import { VendorShopLinks } from "@/components/vendor-shop-links";
import { apiGetNoStore, resolveMediaUrl } from "@/lib/api";

type Vendor = {
  id: number;
  brand_name: string;
  category: string;
  city?: string | null;
  state?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  fax?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  bio_150?: string | null;
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
  const c = v.category || "other";
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

  const bodyText = (v.description_full || "").trim() || (v.bio_150 || "").trim();
  const addrLines = [v.address_line1, v.address_line2].filter(Boolean) as string[];
  const cityLine = [v.city, v.state, v.postal_code].filter((x) => x && String(x).trim()).join(", ");
  const locationFallback = cityLine || "Location not listed";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/vendors" className="text-sm text-[var(--vrr-teal)]">
        ← Directory
      </Link>
      <h1 className="mt-4 text-3xl font-bold">{v.brand_name}</h1>
      <div className="text-sm text-black/60">
        {addrLines.length > 0 ? (
          <p className="whitespace-pre-line">
            {addrLines.join("\n")}
            {cityLine ? `\n${cityLine}` : ""}
          </p>
        ) : (
          <p>{locationFallback}</p>
        )}
      </div>
      {(v.contact_name || v.phone || v.fax || v.contact_email) && (
        <div className="mt-3 rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-sm text-black/75">
          <p className="font-medium text-black/85">Contact</p>
          {v.contact_name ? <p className="mt-1">{v.contact_name}</p> : null}
          {v.phone ? (
            <p className="mt-1">
              Phone:{" "}
              <a href={`tel:${v.phone.replace(/\s/g, "")}`} className="text-[var(--vrr-teal)] underline">
                {v.phone}
              </a>
            </p>
          ) : null}
          {v.fax ? <p className="mt-1">Fax: {v.fax}</p> : null}
          {v.contact_email ? (
            <p className="mt-1">
              Email:{" "}
              <a href={`mailto:${v.contact_email}`} className="text-[var(--vrr-teal)] underline">
                {v.contact_email}
              </a>
            </p>
          ) : null}
        </div>
      )}
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
          src={resolveMediaUrl(v.banner_url) || ""}
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
            src={resolveMediaUrl(v.logo_url) || ""}
            alt=""
            className="size-24 shrink-0 rounded-xl border border-black/10 object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          {bodyText ? (
            <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed">{bodyText}</p>
          ) : (
            <p className="text-sm text-black/55">No description yet.</p>
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
      </div>
      <VendorShopLinks links={v.shop_links || []} />
    </div>
  );
}
