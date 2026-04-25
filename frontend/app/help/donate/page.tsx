import Link from "next/link";

export const metadata = { title: "Donate" };

export default function DonatePage() {
  const useStripe = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const gofundme = process.env.NEXT_PUBLIC_GOFUNDME_URL || "https://www.gofundme.com";
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">Donate</h1>
      <p className="mt-2 text-sm text-black/70">
        Confirm 501(c)(3) or fiscal sponsor status before accepting live donations. Stripe test mode is available for
        development.
      </p>
      {useStripe ? (
        <p className="mt-6 text-sm">
          Stripe Elements checkout can be wired with{" "}
          <code className="rounded bg-black/5 px-1">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> — use test keys until legal
          sign-off.
        </p>
      ) : (
        <p className="mt-6">
          <Link href={gofundme} target="_blank" className="font-semibold text-[var(--vrr-teal)]" rel="noreferrer">
            Contribute via GoFundMe (placeholder link)
          </Link>
        </p>
      )}
    </div>
  );
}
