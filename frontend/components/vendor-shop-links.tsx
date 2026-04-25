"use client";

import { trackEvent } from "@/lib/analytics";

export function VendorShopLinks({ links }: { links: { label: string; url: string }[] }) {
  return (
    <ul className="mt-4 space-y-2">
      {links.map((l, i) => (
        <li key={i}>
          <a
            href={l.url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[var(--vrr-teal)] hover:underline"
            onClick={() => trackEvent("external_link_click", { url: l.url })}
          >
            {l.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
