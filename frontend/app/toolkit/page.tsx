import { ToolkitHubCards } from "./toolkit-hub-cards";

export const metadata = { title: "Audience Recovery Toolkit" };

export default function ToolkitIndex() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--vrr-ink)]">Audience recovery toolkit</h1>
      <p className="mt-2 max-w-2xl text-black/70">
        Reconnect customers after you move or relaunch. Open a tool below or copy its link to share.
      </p>
      <ToolkitHubCards />
    </div>
  );
}
