import { LegalStrip } from "@/components/legal-strip";
import { FacebookGroupEmbed } from "./facebook-group-embed";

export const metadata = { title: "Community" };

export default async function CommunityPage() {
  return (
    <div className="pb-10">
      <div className="mx-auto max-w-4xl px-4 pt-10 sm:px-6">
        <h1 className="text-3xl font-bold">Community hub</h1>
        <p className="mt-2 text-black/70">
          Connect with thousands of painted tree people on Facebook for peer advice, resources, and
          practical community support.
        </p>
      </div>

      <div className="mt-10">
        <FacebookGroupEmbed />
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <LegalStrip />
      </div>
    </div>
  );
}
