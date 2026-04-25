import Link from "next/link";
import { MdBody } from "@/components/md-body";
import { LegalStrip } from "@/components/legal-strip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import { TriageProgress } from "./triage-progress";
import { DownloadPdf } from "./download-pdf";

type Step = { id: number; position: number; title: string; body_md: string };
type Cash = {
  id: number;
  name: string;
  what_it_is: string;
  who_qualifies: string;
  url: string;
  est_time_to_funds: string;
};

export const metadata = { title: "Get Immediate Help" };

export default async function ImmediateHelpPage() {
  let steps: Step[] = [];
  let cash: Cash[] = [];
  let settings: Record<string, string> = {};
  try {
    steps = await apiGet<Step[]>("/api/v1/triage/steps");
    cash = await apiGet<Cash[]>("/api/v1/triage/cash-options");
    settings = await apiGet<Record<string, string>>("/api/v1/settings/public");
  } catch {
    /* empty */
  }
  const pdf = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/static/checklists/inventory-recovery-checklist.pdf`;
  const discord = settings.discord_channel_general || settings.discord_invite_url || "#";

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 print:max-w-none">
      <h1 className="text-3xl font-bold tracking-tight">Get immediate help</h1>
      <p className="mt-2 text-black/70">What to do in the next 48 hours — short steps, no jargon.</p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">What to do in the next 48 hours</h2>
        <TriageProgress steps={steps} />
        <ol className="mt-4 list-decimal space-y-4 pl-5">
          {steps.map((s) => (
            <li key={s.id} className="marker:font-semibold">
              <span className="font-semibold">{s.title}</span>
              <div className="mt-1 text-black/80">
                <MdBody content={s.body_md} />
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-sm">
          <Link href={discord} className="font-medium text-[var(--vrr-teal)] hover:underline" target="_blank">
            Get help with this (Discord)
          </Link>
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Inventory recovery checklist</h2>
        <p className="mt-2 text-sm text-black/70">Download a PDF to assess inventory and document next steps.</p>
        <DownloadPdf href={pdf} />
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Emergency cash options</h2>
        <div className="mt-4 grid gap-4">
          {cash.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <CardTitle className="text-base">{c.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">What it is:</span> {c.what_it_is}
                </p>
                <p>
                  <span className="font-medium">Who qualifies:</span> {c.who_qualifies}
                </p>
                <p>
                  <span className="font-medium">Time to funds:</span> {c.est_time_to_funds}
                </p>
                <a href={c.url} target="_blank" rel="noreferrer" className="font-semibold text-[var(--vrr-teal)]">
                  Apply or learn more
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-xl border border-black/10 bg-[var(--vrr-cream-dark)] p-6">
        <h2 className="text-lg font-semibold">Legal basics: Chapter 7</h2>
        <p className="mt-2 text-sm text-black/75">
          Plain-English overview lives in our Legal Help Center. Read before making big decisions.
        </p>
        <Link href="/legal/bankruptcy" className="mt-3 inline-block text-sm font-semibold text-[var(--vrr-teal)]">
          Open bankruptcy explainer
        </Link>
      </section>

      <LegalStrip />
    </article>
  );
}
