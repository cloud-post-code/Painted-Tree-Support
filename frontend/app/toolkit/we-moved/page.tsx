import { DownloadPdf } from "@/app/immediate-help/download-pdf";
import { apiUrl } from "@/lib/api";

export const metadata = { title: "We Moved kit" };

export default function WeMovedPage() {
  const pdf = apiUrl("/static/checklists/we-moved-kit.pdf");
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">“We moved” messaging kit</h1>
      <p className="mt-2 text-sm text-black/70">PDF with key messages, FAQ, graphic specs, and a 2-week posting schedule.</p>
      <DownloadPdf href={pdf} slug="we-moved-kit" label="Download messaging kit (PDF)" />
    </div>
  );
}
