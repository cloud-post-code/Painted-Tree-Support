import { apiGet } from "@/lib/api";

export const metadata = { title: "Supporters" };

export default async function SupportersAckPage() {
  let html = "";
  try {
    const settings = await apiGet<Record<string, string>>("/api/v1/settings/public");
    html = settings.supporters_ack_html || "";
  } catch {
    html = "";
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Supporter acknowledgments</h1>
      {html ? (
        <div className="prose mt-6" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="mt-6 text-sm text-black/60">
          Publish supporter stories via admin site setting key <code>supporters_ack_html</code>.
        </p>
      )}
    </div>
  );
}
