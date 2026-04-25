import { apiGet } from "@/lib/api";
import { ListingsClient } from "./listings-client";

export const metadata = { title: "Listings board" };

export default async function ListingsPage() {
  let mapsUrl = "";
  try {
    const s = await apiGet<Record<string, string>>("/api/v1/settings/public");
    mapsUrl = s.google_maps_embed_url || "";
  } catch {
    mapsUrl = "";
  }
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Listings board</h1>
      <p className="mt-2 text-black/70">Available booths and vendors seeking space — submissions are reviewed before publishing.</p>
      {mapsUrl && mapsUrl.startsWith("http") && (
        <div className="mt-8 aspect-video w-full overflow-hidden rounded-xl border border-black/10">
          <iframe title="Map" src={mapsUrl} className="h-full min-h-[320px] w-full" loading="lazy" />
        </div>
      )}
      <ListingsClient />
    </div>
  );
}
