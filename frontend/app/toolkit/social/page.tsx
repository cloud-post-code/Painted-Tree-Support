import { TemplatesList } from "../templates-client";

export const metadata = { title: "Social templates" };

export default function ToolkitSocialPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Social relaunch captions</h1>
      <p className="mt-2 text-sm text-black/70">Copy-paste for Instagram, Facebook, or TikTok.</p>
      <TemplatesList kind="social_caption" />
    </div>
  );
}
