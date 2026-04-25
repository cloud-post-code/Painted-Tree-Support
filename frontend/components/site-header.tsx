import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/immediate-help", label: "Get help" },
  { href: "/sell-now", label: "Sell again" },
  { href: "/cash-flow", label: "Cash flow" },
  { href: "/community", label: "Community" },
  { href: "/vendors", label: "Vendors" },
  { href: "/legal", label: "Legal" },
  { href: "/toolkit", label: "Toolkit" },
  { href: "/help", label: "Help vendors" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[var(--vrr-cream)]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="font-semibold tracking-tight text-[var(--vrr-ink)]">
          Vendor Recovery Room
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-md px-2 py-1.5 text-sm text-[var(--vrr-ink)]/80 hover:bg-black/5 hover:text-[var(--vrr-ink)]"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/immediate-help"
          className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}
        >
          Start here
        </Link>
      </div>
    </header>
  );
}
