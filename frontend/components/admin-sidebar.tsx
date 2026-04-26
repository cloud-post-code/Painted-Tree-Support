"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const nav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/blasts", label: "Message blasts" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/resources", label: "Resources" },
  { href: "/admin/guides", label: "Guides" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/legal", label: "Legal" },
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/community", label: "Community" },
];

export function AdminSidebar() {
  const router = useRouter();
  return (
    <aside className="no-print w-52 shrink-0 border-r border-black/10 bg-[var(--vrr-cream)] p-4 text-sm">
      <nav className="space-y-1">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className="block rounded px-2 py-1 hover:bg-black/5">
            {n.label}
          </Link>
        ))}
      </nav>
      <button
        type="button"
        className="mt-6 text-xs text-black/60 hover:underline"
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.push("/admin/login");
          router.refresh();
        }}
      >
        Sign out
      </button>
    </aside>
  );
}
