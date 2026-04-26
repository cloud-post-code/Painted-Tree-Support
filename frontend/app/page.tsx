import Link from "next/link";
import { CtaGrid } from "@/components/cta-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiGet } from "@/lib/api";

type Resource = {
  id: number;
  title: string;
  url: string;
  summary?: string | null;
};

export default async function HomePage() {
  let featured: Resource[] = [];
  let counters: Record<string, number> = {};
  try {
    featured = await apiGet<Resource[]>("/api/v1/resources?category=featured&limit=5");
  } catch {
    featured = [];
  }
  try {
    counters = await apiGet<Record<string, number>>("/api/v1/counters");
  } catch {
    counters = {};
  }

  const vendorCount = counters.vendor_count ?? counters.vendors ?? 0;
  const resourceCount = counters.resources_count ?? counters.resources ?? 0;

  return (
    <div>
      <section className="border-b border-black/10 bg-gradient-to-b from-[var(--vrr-cream)] to-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:py-16">
          <div className="flex-1 space-y-4">
            <p className="text-sm font-medium italic tracking-tight text-[var(--vrr-teal)]">
              Lost your booth? Start here.
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--vrr-ink)] sm:text-4xl xl:text-5xl">
              April showers bring May flowers.
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-black/70">
              One place for emergency steps, selling again, and community — so you can act today, not weeks from now.
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-black/60">
              {(vendorCount > 0 || resourceCount > 0) && (
                <span>
                  {vendorCount ? `${vendorCount}+ vendors in directory` : ""}
                  {vendorCount && resourceCount ? " · " : ""}
                  {resourceCount ? `${resourceCount}+ curated resources` : ""}
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 rounded-2xl border border-black/10 bg-white p-4 shadow-sm lg:max-w-md">
            <p className="mb-3 text-sm font-medium text-black/60">Your command center</p>
            <CtaGrid />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="mb-6 text-xl font-semibold">Featured resources</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.length === 0 && (
            <p className="text-sm text-black/60">Featured links will appear here once published in admin.</p>
          )}
          {featured.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <CardTitle className="text-base">{r.title}</CardTitle>
              </CardHeader>
              <CardContent>
                {r.summary && <p className="mb-3 text-sm text-black/65">{r.summary}</p>}
                <Link
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-[var(--vrr-teal)] hover:underline"
                  data-external
                >
                  Open resource
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
