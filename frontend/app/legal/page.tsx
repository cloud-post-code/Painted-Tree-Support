import Link from "next/link";
import { apiGet } from "@/lib/api";

type Article = { slug: string; title: string; category: string };

export const metadata = { title: "Legal Help Center" };

export default async function LegalIndex() {
  let articles: Article[] = [];
  try {
    articles = await apiGet<Article[]>("/api/v1/legal/articles");
  } catch {
    articles = [];
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Legal help center</h1>
      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        This is educational information, not legal advice. Consult a licensed attorney for your specific situation.
      </p>
      <ul className="mt-8 space-y-3">
        {articles.map((a) => (
          <li key={a.slug}>
            <Link href={`/legal/${a.slug}`} className="text-lg font-semibold text-[var(--vrr-teal)] hover:underline">
              {a.title}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-10">
        <Link href="/legal/directory" className="font-semibold text-[var(--vrr-teal)]">
          Pro bono & legal aid directory
        </Link>
      </p>
    </div>
  );
}
