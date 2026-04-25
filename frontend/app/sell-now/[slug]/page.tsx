import Link from "next/link";
import { notFound } from "next/navigation";
import { MdBody } from "@/components/md-body";
import { apiGetNoStore } from "@/lib/api";

type Guide = {
  slug: string;
  title: string;
  summary?: string | null;
  body_md: string;
  steps_count: number;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ") };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let g: Guide | null = null;
  try {
    g = await apiGetNoStore<Guide>(`/api/v1/guides/${slug}`);
  } catch {
    g = null;
  }
  if (!g) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/sell-now" className="text-sm text-[var(--vrr-teal)]">
        ← All guides
      </Link>
      <h1 className="mt-4 text-3xl font-bold">{g.title}</h1>
      {g.summary && <p className="mt-2 text-lg text-black/70">{g.summary}</p>}
      <p className="mt-2 text-sm text-black/50">About {g.steps_count} steps</p>
      <div className="mt-8">
        <MdBody content={g.body_md} />
      </div>
    </article>
  );
}
