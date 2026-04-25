import Link from "next/link";
import { notFound } from "next/navigation";
import { MdBody } from "@/components/md-body";
import { apiGetNoStore } from "@/lib/api";

type Guide = { title: string; body_md: string };

export default async function LinkInBioGuide() {
  let g: Guide | null = null;
  try {
    g = await apiGetNoStore<Guide>("/api/v1/guides/linktree-setup");
  } catch {
    g = null;
  }
  if (!g) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/toolkit" className="text-sm text-[var(--vrr-teal)]">
        ← Toolkit
      </Link>
      <h1 className="mt-4 text-3xl font-bold">{g.title}</h1>
      <div className="mt-6">
        <MdBody content={g.body_md} />
      </div>
    </article>
  );
}
