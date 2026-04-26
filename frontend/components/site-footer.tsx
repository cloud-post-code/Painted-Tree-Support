import Link from "next/link";

const LEGAL_DISCLAIMER =
  "This is educational information, not legal advice. Consult a licensed attorney for your specific situation.";

export function SiteFooter({ showLegalDisclaimer = false }: { showLegalDisclaimer?: boolean }) {
  return (
    <footer className="mt-auto border-t border-black/10 bg-[var(--vrr-ink)] text-white">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-white/80">
            Project Re-Paint — crisis-to-comeback support for displaced vendors.
          </p>
          <Link
            href="/community"
            className="inline-flex text-sm font-semibold text-[var(--vrr-gold)] hover:underline"
            data-event="discord_join"
          >
            Join our Discord
          </Link>
        </div>
        {showLegalDisclaimer && (
          <p className="text-xs leading-relaxed text-white/70">{LEGAL_DISCLAIMER}</p>
        )}
        <p className="text-xs text-white/50">
          <Link href="/admin/login" className="hover:underline">
            Admin
          </Link>
        </p>
      </div>
    </footer>
  );
}
