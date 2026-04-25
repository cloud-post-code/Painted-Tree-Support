"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

const ctas = [
  { href: "/immediate-help", label: "Get Immediate Help", id: "immediate_help" },
  { href: "/sell-now", label: "Start Selling Again", id: "sell_now" },
  { href: "/community", label: "Join Community", id: "community" },
  { href: "/help", label: "Help Vendors", id: "help_vendors" },
];

export function CtaGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {ctas.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          className={cn(buttonVariants({ variant: "default", size: "lg" }), "w-full justify-center shadow-md")}
          onClick={() => trackEvent("cta_click", { cta_id: c.id })}
        >
          {c.label}
        </Link>
      ))}
    </div>
  );
}
