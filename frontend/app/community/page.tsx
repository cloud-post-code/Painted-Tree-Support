import Link from "next/link";
import { apiGet } from "@/lib/api";
import { LegalStrip } from "@/components/legal-strip";

export const metadata = { title: "Community" };

export default async function CommunityPage() {
  let settings: Record<string, string> = {};
  let links: { id: number; name: string; channel_url: string; description?: string | null }[] = [];
  try {
    settings = await apiGet("/api/v1/settings/public");
    links = await apiGet("/api/v1/community/links");
  } catch {
    /* */
  }
  const widgetId = settings.discord_widget_id;
  const invite = settings.discord_invite_url || "https://discord.com";

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Community hub</h1>
      <p className="mt-2 text-black/70">
        Connect with other vendors for peer support. Introduce yourself in #general when you join.
      </p>
      {widgetId ? (
        <iframe
          title="Discord"
          src={`https://discord.com/widget?id=${widgetId}&theme=dark`}
          width="100%"
          height="400"
          allowTransparency
          className="mt-8 rounded-xl border border-black/10"
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
        />
      ) : (
        <p className="mt-8 text-sm text-black/60">Set `discord_widget_id` in admin site settings to embed the widget.</p>
      )}
      <div className="mt-8">
        <Link
          href={invite}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-lg bg-[#5865F2] px-5 py-3 text-sm font-semibold text-white"
          data-event="discord_join"
        >
          Open Discord invite
        </Link>
      </div>
      <section className="mt-10">
        <h2 className="text-lg font-semibold">Channels</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {links.map((l) => (
            <li key={l.id}>
              <Link href={l.channel_url} className="text-[var(--vrr-teal)] hover:underline" target="_blank">
                {l.name}
              </Link>
              {l.description && <span className="text-black/60"> — {l.description}</span>}
            </li>
          ))}
        </ul>
      </section>
      <LegalStrip />
    </div>
  );
}
