"use client";

import { useState } from "react";
import { resolveMediaUrl } from "@/lib/api";

type Props = {
  brandName: string;
  bannerUrl?: string | null;
  logoUrl?: string | null;
};

/**
 * Full-width hero: banner with overlapping logo, logo-only fallbacks, or a soft placeholder.
 * Matches directory card language on `/vendors`.
 */
export function VendorProfileHero({ brandName, bannerUrl, logoUrl }: Props) {
  const [bannerErr, setBannerErr] = useState(false);
  const [logoErr, setLogoErr] = useState(false);
  const bannerSrc = resolveMediaUrl(bannerUrl);
  const logoSrc = resolveMediaUrl(logoUrl);
  const hasBanner = Boolean(bannerUrl && bannerSrc && !bannerErr);
  const hasLogo = Boolean(logoUrl && logoSrc && !logoErr);
  const overhang = hasBanner && hasLogo;

  if (!String(bannerUrl || "").trim() && !String(logoUrl || "").trim()) {
    return (
      <div
        className="mt-4 aspect-[2/1] w-full max-h-64 rounded-xl border border-black/10 bg-gradient-to-br from-[var(--vrr-teal)]/12 to-[var(--vrr-cream)]"
        aria-hidden
      />
    );
  }

  return (
    <div className="mt-4">
      <div className="relative overflow-hidden rounded-xl border border-black/10">
        {hasBanner ? (
          <div className="aspect-[2/1] max-h-80 w-full bg-black/5 sm:max-h-96">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerSrc!}
              alt=""
              className="h-full w-full object-cover object-center"
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setBannerErr(true)}
            />
            {hasLogo ? (
              <div className="absolute bottom-0 left-6 z-10 translate-y-1/2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoSrc!}
                  alt={brandName}
                  className="size-20 rounded-2xl border-4 border-white bg-white object-cover shadow-md sm:size-24"
                  loading="eager"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() => setLogoErr(true)}
                />
              </div>
            ) : null}
          </div>
        ) : hasLogo ? (
          <div className="flex aspect-[2/1] max-h-80 items-center justify-center bg-gradient-to-br from-[var(--vrr-teal)]/12 to-[var(--vrr-cream)] px-6 sm:max-h-96">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc!}
              alt={brandName}
              className="max-h-32 max-w-[min(20rem,90%)] object-contain sm:max-h-40"
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => setLogoErr(true)}
            />
          </div>
        ) : (
          <div
            className="aspect-[2/1] max-h-80 w-full bg-gradient-to-br from-[var(--vrr-teal)]/8 to-[var(--vrr-cream)] sm:max-h-96"
            aria-hidden
          />
        )}
      </div>
      {overhang ? <div className="h-10 sm:h-12" aria-hidden /> : null}
    </div>
  );
}
