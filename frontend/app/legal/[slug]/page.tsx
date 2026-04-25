import Link from "next/link";
import { notFound } from "next/navigation";
import { MdBody } from "@/components/md-body";
import { apiGetNoStore } from "@/lib/api";

type Article = { slug: string; title: string; body_md: string };

export default async function LegalArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let a: Article | null = null;
  try {
    a = await apiGetNoStore<Article>(`/api/v1/legal/articles/${slug}`);
  } catch {
    a = null;
  }
  if (!a) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/legal" className="text-sm text-[var(--vrr-teal)]">
        ← Legal center
      </Link>
      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        This is educational information, not legal advice. Consult a licensed attorney for your specific situation.
      </div>
      <h1 className="mt-8 text-3xl font-bold">{a.title}</h1>
      <div className="mt-6">
        <MdBody content={a.body_md} />
      </div>
    </article>
  );
}
