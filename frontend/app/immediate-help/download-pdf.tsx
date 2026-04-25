"use client";

import { apiUrl } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";

export function DownloadPdf({
  href,
  slug = "inventory-recovery-checklist",
  label = "Download checklist (PDF)",
}: {
  href: string;
  slug?: string;
  label?: string;
}) {
  return (
    <a
      href={href}
      download
      className="mt-3 inline-flex text-sm font-semibold text-[var(--vrr-teal)] hover:underline"
      onClick={() => {
        trackEvent("pdf_download", { slug });
        void fetch(apiUrl("/api/v1/downloads/log"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
      }}
    >
      {label}
    </a>
  );
}
