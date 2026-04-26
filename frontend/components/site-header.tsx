import { cookies } from "next/headers";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/immediate-help", label: "Get help" },
  { href: "/sell-now", label: "Sell again" },
  { href: "/community", label: "Community" },
  { href: "/vendors", label: "Vendors" },
  { href: "/legal", label: "Legal" },
  { href: "/help", label: "Help vendors" },
];

export async function SiteHeader() {
  const store = await cookies();
  const signedIn = !!store.get("access_token")?.value;
  const isAdmin = store.get("is_admin")?.value === "1";
  const accountHref = isAdmin ? "/admin" : "/account";
  const accountLabel = isAdmin ? "Admin" : "My account";

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[var(--vrr-cream)]/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="font-semibold tracking-tight text-[var(--vrr-ink)]">
          Project Re-Paint
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
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link
              href={accountHref}
              className="hidden rounded-md px-2 py-1.5 text-sm text-[var(--vrr-ink)]/80 hover:bg-black/5 hover:text-[var(--vrr-ink)] sm:inline-block"
            >
              {accountLabel}
            </Link>
          ) : (
            <Link
              href="/login"
              className="hidden rounded-md px-2 py-1.5 text-sm text-[var(--vrr-ink)]/80 hover:bg-black/5 hover:text-[var(--vrr-ink)] sm:inline-block"
            >
              Sign in
            </Link>
          )}
          <Link
            href="/immediate-help"
            className={cn(buttonVariants({ size: "sm" }), "hidden sm:inline-flex")}
          >
            Start here
          </Link>
        </div>
      </div>
    </header>
  );
}
