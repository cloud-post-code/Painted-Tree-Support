export const metadata = { title: "Roadmap" };

export default function RoadmapPage() {
  const items = [
    "Interactive map with self-service pin submission",
    "Vendor-to-space matchmaking (rules engine, then optional ML)",
    "Featured vendor marketplace with richer profiles",
    "Operations & logistics hub (shipping, packaging, pricing)",
    "Support & wellbeing (peer threads, burnout resources, stories)",
  ];
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Phase 3 roadmap</h1>
      <p className="mt-2 text-sm text-black/70">Planning tickets — not yet in MVP scope.</p>
      <ul className="mt-8 list-disc space-y-3 pl-5 text-sm">
        {items.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
