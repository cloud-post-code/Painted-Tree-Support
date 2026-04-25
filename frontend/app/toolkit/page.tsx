import Link from "next/link";

export const metadata = { title: "Audience Recovery Toolkit" };

export default function ToolkitIndex() {
  const links = [
    { href: "/toolkit/social", label: "Social captions (5+)" },
    { href: "/toolkit/email", label: "Email announcements" },
    { href: "/toolkit/we-moved", label: "“We moved” messaging kit (PDF)" },
    { href: "/toolkit/link-in-bio", label: "Link-in-bio guide" },
    { href: "/toolkit/landing-page", label: "Simple landing page (Carrd)" },
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Audience recovery toolkit</h1>
      <p className="mt-2 text-black/70">Reconnect customers after you move or relaunch.</p>
      <ul className="mt-8 space-y-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-lg font-semibold text-[var(--vrr-teal)] hover:underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
