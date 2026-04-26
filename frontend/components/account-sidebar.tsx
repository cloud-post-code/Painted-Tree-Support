"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const nav: { href: string; label: string }[] = [
  { href: "/account", label: "Overview" },
  { href: "/account/submissions", label: "My submissions" },
  { href: "/account/inbox", label: "Inbox" },
];

export function AccountSidebar({ unreadCount }: { unreadCount?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <aside className="no-print w-56 shrink-0 border-r border-black/10 bg-[var(--vrr-cream)] p-4 text-sm">
      <nav className="space-y-1">
        {nav.map((n) => {
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center justify-between rounded px-2 py-1.5",
                active ? "bg-black/10 font-semibold text-[var(--vrr-ink)]" : "hover:bg-black/5"
              )}
            >
              <span>{n.label}</span>
              {n.href === "/account/inbox" && unreadCount && unreadCount > 0 ? (
                <span className="ml-2 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--vrr-teal)] px-1.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        className="mt-6 text-xs text-black/60 hover:underline"
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/login");
          router.refresh();
        }}
      >
        Sign out
      </button>
    </aside>
  );
}
