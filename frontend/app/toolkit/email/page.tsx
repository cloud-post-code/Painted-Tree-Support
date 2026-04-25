import { TemplatesList } from "../templates-client";

export const metadata = { title: "Email templates" };

export default function ToolkitEmailPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Email announcements</h1>
      <p className="mt-2 text-sm text-black/70">Formal, casual, and urgent tones for Mailchimp or Gmail.</p>
      <TemplatesList kind="email" />
    </div>
  );
}
